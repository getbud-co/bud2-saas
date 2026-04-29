CREATE TABLE tags (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations(id),
    name            TEXT        NOT NULL,
    color           TEXT        NOT NULL DEFAULT 'neutral'
                                CHECK (color IN ('neutral', 'orange', 'wine', 'caramel', 'success', 'warning', 'error')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tags_organization_id ON tags (organization_id);
CREATE INDEX idx_tags_deleted_at ON tags (deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_tags_org_name_unique ON tags (organization_id, LOWER(name)) WHERE deleted_at IS NULL;
