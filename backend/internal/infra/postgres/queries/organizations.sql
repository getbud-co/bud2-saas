-- name: CreateOrganization :one
INSERT INTO organizations (name, domain, workspace, status)
VALUES ($1, $2, $3, $4)
RETURNING id, name, domain, workspace, status, created_at, updated_at;

-- name: GetOrganizationByID :one
SELECT id, name, domain, workspace, status, created_at, updated_at FROM organizations
WHERE id = $1
  AND deleted_at IS NULL;

-- name: GetOrganizationByIDForUser :one
SELECT o.id, o.name, o.domain, o.workspace, o.status, o.created_at, o.updated_at
FROM organizations o
JOIN organization_memberships om ON om.organization_id = o.id
WHERE om.user_id = $1
  AND o.id = $2
  AND om.status = 'active'
  AND om.deleted_at IS NULL
  AND o.deleted_at IS NULL;

-- name: GetOrganizationByDomain :one
SELECT id, name, domain, workspace, status, created_at, updated_at FROM organizations
WHERE LOWER(domain) = LOWER($1)
  AND deleted_at IS NULL;

-- name: GetOrganizationByWorkspace :one
SELECT id, name, domain, workspace, status, created_at, updated_at FROM organizations
WHERE workspace = $1
  AND deleted_at IS NULL;

-- name: ListOrganizations :many
SELECT id, name, domain, workspace, status, created_at, updated_at FROM organizations
WHERE deleted_at IS NULL
ORDER BY name ASC
LIMIT $1
OFFSET $2;

-- name: ListOrganizationsByUser :many
SELECT o.id, o.name, o.domain, o.workspace, o.status, o.created_at, o.updated_at
FROM organizations o
JOIN organization_memberships om ON om.organization_id = o.id
WHERE om.user_id = $1
  AND om.status = 'active'
  AND om.deleted_at IS NULL
  AND o.deleted_at IS NULL
ORDER BY o.name ASC
LIMIT $2
OFFSET $3;

-- name: ListOrganizationsByStatus :many
SELECT id, name, domain, workspace, status, created_at, updated_at FROM organizations
WHERE status = $1
  AND deleted_at IS NULL
ORDER BY name ASC
LIMIT $2
OFFSET $3;

-- name: ListOrganizationsByUserAndStatus :many
SELECT o.id, o.name, o.domain, o.workspace, o.status, o.created_at, o.updated_at
FROM organizations o
JOIN organization_memberships om ON om.organization_id = o.id
WHERE om.user_id = $1
  AND o.status = $2
  AND om.status = 'active'
  AND om.deleted_at IS NULL
  AND o.deleted_at IS NULL
ORDER BY o.name ASC
LIMIT $3
OFFSET $4;

-- name: CountOrganizations :one
SELECT COUNT(*) FROM organizations
WHERE deleted_at IS NULL;

-- name: CountOrganizationsByUser :one
SELECT COUNT(*)
FROM organizations o
JOIN organization_memberships om ON om.organization_id = o.id
WHERE om.user_id = $1
  AND om.status = 'active'
  AND om.deleted_at IS NULL
  AND o.deleted_at IS NULL;

-- name: CountOrganizationsByStatus :one
SELECT COUNT(*) FROM organizations
WHERE status = $1
  AND deleted_at IS NULL;

-- name: CountOrganizationsByUserAndStatus :one
SELECT COUNT(*)
FROM organizations o
JOIN organization_memberships om ON om.organization_id = o.id
WHERE om.user_id = $1
  AND o.status = $2
  AND om.status = 'active'
  AND om.deleted_at IS NULL
  AND o.deleted_at IS NULL;

-- name: UpdateOrganization :one
UPDATE organizations
SET
    name       = $2,
    domain     = $3,
    workspace  = $4,
    status     = $5,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING id, name, domain, workspace, status, created_at, updated_at;

-- name: SoftDeleteOrganization :exec
UPDATE organizations
SET deleted_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;
