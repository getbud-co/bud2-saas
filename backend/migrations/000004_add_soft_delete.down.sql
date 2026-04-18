DROP INDEX IF EXISTS idx_memberships_organization_user_unique;
DROP INDEX IF EXISTS idx_users_email_unique;
DROP INDEX IF EXISTS idx_organizations_workspace_unique;
DROP INDEX IF EXISTS idx_organizations_domain_unique;
DROP INDEX IF EXISTS idx_memberships_deleted_at;
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_organizations_deleted_at;

ALTER TABLE organization_memberships DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE organizations DROP COLUMN IF EXISTS deleted_at;
