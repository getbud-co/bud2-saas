-- name: CreateMission :one
INSERT INTO missions (id, organization_id, cycle_id, parent_id, owner_id, team_id, title, description, status, visibility, kanban_status, sort_order, due_date, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING id, organization_id, cycle_id, parent_id, owner_id, team_id, title, description, status, visibility, kanban_status, sort_order, due_date, completed_at, created_at, updated_at;

-- name: GetMissionByID :one
SELECT id, organization_id, cycle_id, parent_id, owner_id, team_id, title, description, status, visibility, kanban_status, sort_order, due_date, completed_at, created_at, updated_at
FROM missions
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: ListMissions :many
SELECT id, organization_id, cycle_id, parent_id, owner_id, team_id, title, description, status, visibility, kanban_status, sort_order, due_date, completed_at, created_at, updated_at
FROM missions
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('cycle_id')::uuid IS NULL OR cycle_id = sqlc.narg('cycle_id'))
  AND (sqlc.narg('owner_id')::uuid IS NULL OR owner_id = sqlc.narg('owner_id'))
  AND (sqlc.narg('team_id')::uuid IS NULL OR team_id = sqlc.narg('team_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
  AND (
    NOT sqlc.arg('filter_by_parent')::bool
    OR (sqlc.narg('parent_id')::uuid IS NULL AND parent_id IS NULL)
    OR parent_id = sqlc.narg('parent_id')
  )
ORDER BY sort_order ASC, created_at ASC
LIMIT $2 OFFSET $3;

-- name: CountMissions :one
SELECT COUNT(*)
FROM missions
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('cycle_id')::uuid IS NULL OR cycle_id = sqlc.narg('cycle_id'))
  AND (sqlc.narg('owner_id')::uuid IS NULL OR owner_id = sqlc.narg('owner_id'))
  AND (sqlc.narg('team_id')::uuid IS NULL OR team_id = sqlc.narg('team_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
  AND (
    NOT sqlc.arg('filter_by_parent')::bool
    OR (sqlc.narg('parent_id')::uuid IS NULL AND parent_id IS NULL)
    OR parent_id = sqlc.narg('parent_id')
  );

-- name: UpdateMission :one
UPDATE missions
SET title         = $3,
    description   = $4,
    cycle_id      = $5,
    parent_id     = $6,
    owner_id      = $7,
    team_id       = $8,
    status        = $9,
    visibility    = $10,
    kanban_status = $11,
    sort_order    = $12,
    due_date      = $13,
    completed_at  = $14,
    updated_at    = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
RETURNING id, organization_id, cycle_id, parent_id, owner_id, team_id, title, description, status, visibility, kanban_status, sort_order, due_date, completed_at, created_at, updated_at;

-- IsMissionDescendant and SoftDeleteMissionSubtree use recursive CTEs and are
-- implemented as raw pgx queries in the repository (sqlc parser does not
-- handle recursive CTE column aliasing reliably).
