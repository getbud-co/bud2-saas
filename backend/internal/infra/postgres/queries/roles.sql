-- name: ListRoles :many
SELECT
  r.id,
  r.slug,
  r.name,
  r.description,
  r.type,
  r.scope,
  r.is_default,
  COALESCE(COUNT(u.id), 0)::int AS users_count,
  r.created_at,
  r.updated_at
FROM roles r
LEFT JOIN organization_memberships om
  ON om.role = r.slug
  AND om.organization_id = $1
  AND om.deleted_at IS NULL
LEFT JOIN users u
  ON u.id = om.user_id
  AND u.deleted_at IS NULL
GROUP BY r.id
ORDER BY
  CASE r.type WHEN 'system' THEN 0 ELSE 1 END,
  r.created_at ASC;
