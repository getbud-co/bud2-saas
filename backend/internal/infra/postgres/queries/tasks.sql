-- name: CreateTask :one
INSERT INTO tasks (id, organization_id, mission_id, assignee_id, title, description, status, sort_order, due_date, completed_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
RETURNING id, organization_id, mission_id, assignee_id, title, description, status, sort_order, due_date, completed_at, created_at, updated_at;

-- name: GetTaskByID :one
SELECT id, organization_id, mission_id, assignee_id, title, description, status, sort_order, due_date, completed_at, created_at, updated_at
FROM tasks
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: ListTasks :many
SELECT id, organization_id, mission_id, assignee_id, title, description, status, sort_order, due_date, completed_at, created_at, updated_at
FROM tasks
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('mission_id')::uuid IS NULL OR mission_id = sqlc.narg('mission_id'))
  AND (sqlc.narg('assignee_id')::uuid IS NULL OR assignee_id = sqlc.narg('assignee_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'))
ORDER BY sort_order ASC, created_at ASC
LIMIT $2 OFFSET $3;

-- name: CountTasks :one
SELECT COUNT(*)
FROM tasks
WHERE organization_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg('mission_id')::uuid IS NULL OR mission_id = sqlc.narg('mission_id'))
  AND (sqlc.narg('assignee_id')::uuid IS NULL OR assignee_id = sqlc.narg('assignee_id'))
  AND (sqlc.narg('status')::text IS NULL OR status = sqlc.narg('status'));

-- name: UpdateTask :one
UPDATE tasks
SET title        = $3,
    description  = $4,
    assignee_id  = $5,
    status       = $6,
    sort_order   = $7,
    due_date     = $8,
    completed_at = $9,
    updated_at   = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
RETURNING id, organization_id, mission_id, assignee_id, title, description, status, sort_order, due_date, completed_at, created_at, updated_at;

-- name: SoftDeleteTask :execrows
UPDATE tasks
SET deleted_at = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;
