-- name: CreateCheckIn :one
INSERT INTO checkins (id, org_id, indicator_id, author_id, value, previous_value, confidence, note, mentions)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, org_id, indicator_id, author_id, value, previous_value, confidence, note, mentions, created_at, updated_at;

-- name: GetCheckInByID :one
SELECT id, org_id, indicator_id, author_id, value, previous_value, confidence, note, mentions, created_at, updated_at
FROM checkins
WHERE id = $1
  AND org_id = $2
  AND deleted_at IS NULL;

-- name: ListCheckInsByIndicator :many
SELECT
    ci.id, ci.org_id, ci.indicator_id, ci.author_id,
    ci.value, ci.previous_value, ci.confidence, ci.note, ci.mentions,
    ci.created_at, ci.updated_at,
    u.first_name AS author_first_name,
    u.last_name  AS author_last_name
FROM checkins ci
JOIN users u ON u.id = ci.author_id
WHERE ci.org_id = $1
  AND ci.indicator_id = $2
  AND ci.deleted_at IS NULL
ORDER BY ci.created_at DESC
LIMIT $3 OFFSET $4;

-- name: CountCheckInsByIndicator :one
SELECT COUNT(*)
FROM checkins
WHERE org_id = $1
  AND indicator_id = $2
  AND deleted_at IS NULL;

-- name: UpdateCheckIn :one
UPDATE checkins
SET value          = $3,
    confidence     = $4,
    note           = $5,
    mentions       = $6,
    updated_at     = NOW()
WHERE id = $1
  AND org_id = $2
  AND deleted_at IS NULL
RETURNING id, org_id, indicator_id, author_id, value, previous_value, confidence, note, mentions, created_at, updated_at;

-- name: SoftDeleteCheckIn :exec
UPDATE checkins
SET deleted_at = NOW()
WHERE id = $1
  AND org_id = $2
  AND deleted_at IS NULL;
