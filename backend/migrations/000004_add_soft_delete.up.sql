ALTER TABLE organizations ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE organization_memberships ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_memberships_deleted_at ON organization_memberships(deleted_at) WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_organizations_domain_unique ON organizations (LOWER(domain))
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_organizations_workspace_unique ON organizations (workspace)
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_users_email_unique ON users (LOWER(email))
WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_memberships_organization_user_unique ON organization_memberships (organization_id, user_id)
WHERE deleted_at IS NULL;
