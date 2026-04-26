-- Soft-deletes mission $1 and every descendant within organization $2.
-- $1 = root_id, $2 = organization_id
--
-- Lives outside queries/ because sqlc cannot resolve column references in
-- recursive CTEs. Loaded into the repository via //go:embed.
--
-- Cycle protection: the recursive arm tracks the visited path and stops at any
-- node already in it. See is_mission_descendant.sql for the rationale.
WITH RECURSIVE subtree AS (
    SELECT m.id, ARRAY[m.id] AS path FROM missions m
    WHERE m.id = $1 AND m.organization_id = $2 AND m.deleted_at IS NULL
    UNION ALL
    SELECT m.id, s.path || m.id FROM missions m
    INNER JOIN subtree s ON m.parent_id = s.id
    WHERE m.organization_id = $2 AND m.deleted_at IS NULL
      AND NOT (m.id = ANY(s.path))
)
UPDATE missions
SET deleted_at = NOW()
WHERE missions.id IN (SELECT id FROM subtree)
  AND missions.organization_id = $2
