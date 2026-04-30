-- name: CreateTag :one
INSERT INTO tags (id, organization_id, name, color)
VALUES ($1, $2, $3, $4)
RETURNING id, organization_id, name, color, created_at, updated_at;

-- name: GetTagByID :one
SELECT id, organization_id, name, color, created_at, updated_at
FROM tags
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: GetTagByName :one
SELECT id, organization_id, name, color, created_at, updated_at
FROM tags
WHERE organization_id = $1
  AND LOWER(name) = LOWER($2)
  AND deleted_at IS NULL;

-- name: ListTags :many
SELECT t.id, t.organization_id, t.name, t.color, t.created_at, t.updated_at,
       COUNT(m.id) FILTER (WHERE m.deleted_at IS NULL) AS usage_count
FROM tags t
LEFT JOIN mission_tags mt ON mt.org_id = t.organization_id AND mt.tag_id = t.id
LEFT JOIN missions m       ON m.organization_id = mt.org_id AND m.id = mt.mission_id
WHERE t.organization_id = $1
  AND t.deleted_at IS NULL
GROUP BY t.id
ORDER BY LOWER(t.name) ASC
LIMIT $2 OFFSET $3;

-- name: CountTags :one
SELECT COUNT(*)
FROM tags
WHERE organization_id = $1
  AND deleted_at IS NULL;

-- name: UpdateTag :one
UPDATE tags
SET name       = $3,
    color      = $4,
    updated_at = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
RETURNING id, organization_id, name, color, created_at, updated_at;

-- name: SoftDeleteTag :exec
UPDATE tags
SET deleted_at = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;
