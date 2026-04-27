-- name: CreateTeam :one
INSERT INTO teams (id, organization_id, name, description, color, status)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, organization_id, name, description, color, status, created_at, updated_at;

-- name: GetTeamByID :one
SELECT id, organization_id, name, description, color, status, created_at, updated_at
FROM teams
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: GetTeamByName :one
SELECT id, organization_id, name, description, color, status, created_at, updated_at
FROM teams
WHERE organization_id = $1
  AND LOWER(name) = LOWER($2)
  AND deleted_at IS NULL;

-- name: ListTeams :many
SELECT id, organization_id, name, description, color, status, created_at, updated_at
FROM teams
WHERE organization_id = $1
  AND deleted_at IS NULL
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: ListTeamsByStatus :many
SELECT id, organization_id, name, description, color, status, created_at, updated_at
FROM teams
WHERE organization_id = $1
  AND status = $2
  AND deleted_at IS NULL
ORDER BY created_at ASC
LIMIT $3 OFFSET $4;

-- name: CountTeams :one
SELECT COUNT(*)
FROM teams
WHERE organization_id = $1
  AND deleted_at IS NULL;

-- name: CountTeamsByStatus :one
SELECT COUNT(*)
FROM teams
WHERE organization_id = $1
  AND status = $2
  AND deleted_at IS NULL;

-- name: UpdateTeam :one
UPDATE teams
SET name        = $3,
    description = $4,
    color       = $5,
    status      = $6,
    updated_at  = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL
RETURNING id, organization_id, name, description, color, status, created_at, updated_at;

-- name: SoftDeleteTeam :exec
UPDATE teams
SET deleted_at = NOW()
WHERE id = $1
  AND organization_id = $2
  AND deleted_at IS NULL;

-- name: CreateTeamMember :one
INSERT INTO team_members (organization_id, team_id, user_id, role_in_team)
VALUES ($1, $2, $3, $4)
RETURNING id, team_id, user_id, role_in_team, joined_at, created_at, updated_at;

-- name: ListTeamMembers :many
SELECT tm.id,
       tm.team_id,
       tm.user_id,
       tm.role_in_team,
       tm.joined_at,
       tm.created_at,
       tm.updated_at,
       u.first_name,
       u.last_name,
       u.job_title
FROM team_members tm
         INNER JOIN teams t ON t.id = tm.team_id AND t.organization_id = $2 AND t.deleted_at IS NULL
         INNER JOIN organization_memberships om ON om.organization_id = t.organization_id AND om.user_id = tm.user_id AND om.status = 'active' AND om.deleted_at IS NULL
         INNER JOIN users u ON u.id = tm.user_id AND u.deleted_at IS NULL
WHERE tm.team_id = $1
  AND tm.deleted_at IS NULL
ORDER BY tm.created_at ASC;

-- name: ListTeamMembersForSync :many
SELECT id, team_id, user_id, role_in_team, joined_at, created_at, updated_at
FROM team_members
WHERE team_id = $1
  AND deleted_at IS NULL
ORDER BY created_at ASC;

-- name: GetTeamMemberByTeamAndUser :one
SELECT id, team_id, user_id, role_in_team, joined_at, created_at, updated_at
FROM team_members
WHERE team_id = $1
  AND user_id = $2
  AND deleted_at IS NULL;

-- name: UpdateTeamMember :one
UPDATE team_members
SET role_in_team = $2,
    updated_at   = NOW()
WHERE id = $1
  AND deleted_at IS NULL
RETURNING id, team_id, user_id, role_in_team, joined_at, created_at, updated_at;

-- name: SoftDeleteTeamMember :exec
UPDATE team_members
SET deleted_at = NOW()
WHERE id = $1
  AND deleted_at IS NULL;

-- name: SoftDeleteTeamMembersByTeam :exec
UPDATE team_members
SET deleted_at = NOW()
WHERE team_id = $1
  AND deleted_at IS NULL;

-- name: ListTeamMembersByOrganizationUser :many
SELECT tm.id, tm.team_id, tm.user_id, tm.role_in_team, tm.joined_at, tm.created_at, tm.updated_at
FROM team_members tm
  JOIN teams t ON t.id = tm.team_id AND t.organization_id = @organization_id AND t.deleted_at IS NULL
WHERE tm.user_id = @user_id AND tm.deleted_at IS NULL
ORDER BY tm.created_at ASC;

-- name: ListTeamMembersByOrganizationUsers :many
SELECT tm.team_id, tm.user_id
FROM team_members tm
  JOIN teams t ON t.id = tm.team_id AND t.organization_id = @organization_id AND t.deleted_at IS NULL
WHERE tm.user_id = ANY(@user_ids::uuid[]) AND tm.deleted_at IS NULL;

-- name: SoftDeleteTeamMembersByOrganizationUser :exec
UPDATE team_members tm
SET deleted_at = NOW()
FROM teams t
WHERE tm.team_id = t.id
  AND t.organization_id = $1
  AND tm.user_id = $2
  AND tm.deleted_at IS NULL
  AND t.deleted_at IS NULL;
