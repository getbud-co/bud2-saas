ALTER TABLE refresh_tokens
ADD COLUMN active_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_refresh_tokens_active_organization_id ON refresh_tokens(active_organization_id)
WHERE active_organization_id IS NOT NULL;
