-- Soft-deletes mission $1 and every descendant within organization $2,
-- cascading the deletion to every indicator and task whose mission_id falls
-- inside the same subtree. Runs as a single CTE — Postgres evaluates the
-- recursive subtree once and then chains three UPDATEs that all commit or
-- roll back together (pgx-friendly: one statement, two parameters).
--
-- $1 = root_id, $2 = organization_id
--
-- Lives outside queries/ because sqlc cannot resolve column references in
-- recursive CTEs. Loaded into the repository via //go:embed.
--
-- Cycle protection: the recursive arm tracks the visited path and stops at
-- any node already in it.
WITH RECURSIVE subtree AS (
    SELECT m.id, ARRAY[m.id] AS path FROM missions m
    WHERE m.id = $1 AND m.organization_id = $2 AND m.deleted_at IS NULL
    UNION ALL
    SELECT m.id, s.path || m.id FROM missions m
    INNER JOIN subtree s ON m.parent_id = s.id
    WHERE m.organization_id = $2 AND m.deleted_at IS NULL
      AND NOT (m.id = ANY(s.path))
), deleted_indicators AS (
    UPDATE indicators
    SET deleted_at = NOW()
    WHERE organization_id = $2
      AND deleted_at IS NULL
      AND mission_id IN (SELECT id FROM subtree)
    RETURNING 1
), deleted_tasks AS (
    UPDATE tasks
    SET deleted_at = NOW()
    WHERE organization_id = $2
      AND deleted_at IS NULL
      AND mission_id IN (SELECT id FROM subtree)
    RETURNING 1
)
UPDATE missions
SET deleted_at = NOW()
WHERE id IN (SELECT id FROM subtree)
  AND organization_id = $2
