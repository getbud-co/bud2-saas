-- name: CreateIndicator :one
INSERT INTO indicators (id, organization_id, mission_id, owner_id, title, description, target_value, current_value, unit, status, due_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id, organization_id, mission_id, owner_id, title, description, target_value, current_value, unit, status, due_date, created_at, updated_at;

-- name: GetIndicatorByID :one
SELECT id, organization_id, mission_id, owner_id, title, description, target_value, current_value, unit, status, due_date, created_at, updated_at
FROM indicators
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: ListIndicators :many
SELECT id, organization_id, mission_id, owner_id, title, description, target_value, current_value, unit, status, due_date, created_at, updated_at
FROM indicators
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('mission_id')::uuid IS NULL OR mission_id = sqlc.narg('mission_id'))
  AND (sqlc.narg('owner_id')::uuid IS NULL OR owner_id = sqlc.narg('owner_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: CountIndicators :one
SELECT COUNT(*)
FROM indicators
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('mission_id')::uuid IS NULL OR mission_id = sqlc.narg('mission_id'))
  AND (sqlc.narg('owner_id')::uuid IS NULL OR owner_id = sqlc.narg('owner_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'));

-- name: UpdateIndicator :one
UPDATE indicators
SET title         = $3,
    description   = $4,
    owner_id      = $5,
    target_value  = $6,
    current_value = $7,
    unit          = $8,
    status        = $9,
    due_date      = $10,
    updated_at    = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
RETURNING id, organization_id, mission_id, owner_id, title, description, target_value, current_value, unit, status, due_date, created_at, updated_at;

-- name: SoftDeleteIndicator :execrows
UPDATE indicators
SET deleted_at = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;
