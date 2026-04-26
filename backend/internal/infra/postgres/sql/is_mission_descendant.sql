-- Returns true if $3 is in the subtree rooted at $2 within organization $1.
-- $1 = organization_id, $2 = ancestor_id, $3 = candidate_id
--
-- Lives outside queries/ because sqlc cannot resolve column references in
-- recursive CTEs. Loaded into the repository via //go:embed.
--
-- Cycle protection: the recursive arm tracks the visited path and stops at any
-- node already in it. If a tree cycle ever exists in the data (e.g., due to a
-- TOCTOU race in the validate-then-update flow at the use case layer), the CTE
-- still terminates instead of looping until statement_timeout.
WITH RECURSIVE subtree AS (
    SELECT m.id, ARRAY[m.id] AS path FROM missions m
    WHERE m.id = $2 AND m.organization_id = $1 AND m.deleted_at IS NULL
    UNION ALL
    SELECT m.id, s.path || m.id FROM missions m
    INNER JOIN subtree s ON m.parent_id = s.id
    WHERE m.organization_id = $1 AND m.deleted_at IS NULL
      AND NOT (m.id = ANY(s.path))
)
SELECT EXISTS(SELECT 1 FROM subtree WHERE id = $3)
