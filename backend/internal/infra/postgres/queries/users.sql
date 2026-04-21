-- name: CreateUser :one
INSERT INTO users (id, name, email, password_hash, status, is_system_admin)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, name, email, password_hash, status, is_system_admin, created_at, updated_at;

-- name: GetUserByID :one
SELECT id, name, email, password_hash, status, is_system_admin, created_at, updated_at FROM users
WHERE id = $1
  AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT id, name, email, password_hash, status, is_system_admin, created_at, updated_at FROM users
WHERE LOWER(email) = LOWER($1)
  AND deleted_at IS NULL;

-- name: UpdateUser :one
UPDATE users
SET name       = $2,
    email      = $3,
    password_hash = $4,
    status     = $5,
    is_system_admin = $6,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING id, name, email, password_hash, status, is_system_admin, created_at, updated_at;
