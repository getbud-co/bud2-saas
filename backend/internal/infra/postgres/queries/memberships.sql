-- name: CreateOrganizationMembership :one
INSERT INTO organization_memberships (organization_id, user_id, role, status)
VALUES ($1, $2, $3, $4)
RETURNING id, organization_id, user_id, role, status, invited_by_user_id, joined_at, created_at, updated_at;

-- name: ListOrganizationMemberships :many
SELECT id, organization_id, user_id, role, status, invited_by_user_id, joined_at, created_at, updated_at
FROM organization_memberships
WHERE organization_id = $1
  AND deleted_at IS NULL
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: CountOrganizationMemberships :one
SELECT COUNT(*) FROM organization_memberships
WHERE organization_id = $1
  AND deleted_at IS NULL;

-- name: ListUserMemberships :many
SELECT id, organization_id, user_id, role, status, invited_by_user_id, joined_at, created_at, updated_at
FROM organization_memberships
WHERE user_id = $1
  AND deleted_at IS NULL
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: UpdateOrganizationMembership :one
UPDATE organization_memberships
SET role = $2,
    status = $3,
    updated_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING id, organization_id, user_id, role, status, invited_by_user_id, joined_at, created_at, updated_at;
