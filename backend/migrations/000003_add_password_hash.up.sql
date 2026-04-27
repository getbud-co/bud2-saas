CREATE TABLE organization_memberships (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id    UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role               TEXT        NOT NULL CHECK (role IN ('admin', 'manager', 'collaborator')),
    status             TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('invited', 'active', 'inactive')),
    invited_by_user_id UUID        REFERENCES users(id) ON DELETE SET NULL,
    joined_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memberships_organization_status ON organization_memberships (organization_id, status);
CREATE INDEX idx_memberships_user_status ON organization_memberships (user_id, status);

-- A user has at most one membership per organization. The constraint also
-- gives composite FKs (organization_id, user_id) something to reference
-- when other tables (missions.owner_id, indicators.owner_id,
-- tasks.assignee_id) want to enforce tenant consistency at the schema
-- level rather than only in the application layer.
ALTER TABLE organization_memberships
  ADD CONSTRAINT organization_memberships_org_user_key
  UNIQUE (organization_id, user_id);
