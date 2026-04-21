-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (id, user_id, active_organization_id, token_hash, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, active_organization_id, token_hash, expires_at, revoked_at, created_at;

-- name: GetRefreshTokenByTokenHash :one
SELECT id, user_id, active_organization_id, token_hash, expires_at, revoked_at, created_at
FROM refresh_tokens
WHERE token_hash = $1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE id = $1 AND revoked_at IS NULL;

-- name: RevokeAllRefreshTokensByUserID :exec
UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;
