-- name: CreateCycle :one
INSERT INTO cycles (id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date, created_at, updated_at;

-- name: GetCycleByID :one
SELECT id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date, created_at, updated_at
FROM cycles
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: GetCycleByName :one
SELECT id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date, created_at, updated_at
FROM cycles
WHERE organization_id = $1
  AND LOWER(name) = LOWER($2)
  AND deleted_at IS NULL;

-- name: ListCycles :many
SELECT id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date, created_at, updated_at
FROM cycles
WHERE organization_id = $1
  AND deleted_at IS NULL
ORDER BY start_date ASC, created_at ASC
LIMIT $2 OFFSET $3;

-- name: ListCyclesByStatus :many
SELECT id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date, created_at, updated_at
FROM cycles
WHERE organization_id = $1
  AND status = $2
  AND deleted_at IS NULL
ORDER BY start_date ASC, created_at ASC
LIMIT $3 OFFSET $4;

-- name: CountCycles :one
SELECT COUNT(*)
FROM cycles
WHERE organization_id = $1
  AND deleted_at IS NULL;

-- name: CountCyclesByStatus :one
SELECT COUNT(*)
FROM cycles
WHERE organization_id = $1
  AND status = $2
  AND deleted_at IS NULL;

-- name: UpdateCycle :one
UPDATE cycles
SET name                    = $3,
    type                    = $4,
    start_date              = $5,
    end_date                = $6,
    status                  = $7,
    okr_definition_deadline = $8,
    mid_review_date         = $9,
    updated_at              = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
RETURNING id, organization_id, name, type, start_date, end_date, status, okr_definition_deadline, mid_review_date, created_at, updated_at;

-- name: SoftDeleteCycle :exec
UPDATE cycles
SET deleted_at = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;
