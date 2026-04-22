-- name: CreateUser :one
INSERT INTO users (id, first_name, last_name, email, password_hash, status, is_system_admin,
                   nickname, job_title, birth_date, language, gender, phone)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING id, first_name, last_name, email, password_hash, status, is_system_admin,
          nickname, job_title, birth_date, language, gender, phone, created_at, updated_at;

-- name: GetUserByID :one
SELECT id, first_name, last_name, email, password_hash, status, is_system_admin,
       nickname, job_title, birth_date, language, gender, phone, created_at, updated_at
FROM users
WHERE id = $1
  AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT id, first_name, last_name, email, password_hash, status, is_system_admin,
       nickname, job_title, birth_date, language, gender, phone, created_at, updated_at
FROM users
WHERE LOWER(email) = LOWER($1)
  AND deleted_at IS NULL;

-- name: ListOrganizationUsersByStatus :many
SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.status, u.is_system_admin,
       u.nickname, u.job_title, u.birth_date, u.language, u.gender, u.phone, u.created_at, u.updated_at
FROM users u
INNER JOIN organization_memberships om ON om.user_id = u.id
WHERE om.organization_id = $1
  AND u.status = $2
  AND om.deleted_at IS NULL
  AND u.deleted_at IS NULL
ORDER BY u.created_at ASC
LIMIT $3 OFFSET $4;

-- name: CountOrganizationUsersByStatus :one
SELECT COUNT(*)
FROM users u
INNER JOIN organization_memberships om ON om.user_id = u.id
WHERE om.organization_id = $1
  AND u.status = $2
  AND om.deleted_at IS NULL
  AND u.deleted_at IS NULL;

-- name: UpdateUser :one
UPDATE users
SET first_name     = $2,
    last_name      = $3,
    email          = $4,
    password_hash  = $5,
    status         = $6,
    is_system_admin = $7,
    nickname       = $8,
    job_title      = $9,
    birth_date     = $10,
    language       = $11,
    gender         = $12,
    phone          = $13,
    updated_at     = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING id, first_name, last_name, email, password_hash, status, is_system_admin,
          nickname, job_title, birth_date, language, gender, phone, created_at, updated_at;
