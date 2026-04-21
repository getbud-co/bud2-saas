DROP INDEX IF EXISTS idx_refresh_tokens_active_organization_id;

ALTER TABLE refresh_tokens
DROP COLUMN IF EXISTS active_organization_id;
