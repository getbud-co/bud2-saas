CREATE TABLE organizations (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT        NOT NULL,
    domain     TEXT        NOT NULL,
    workspace  TEXT        NOT NULL,
    status     TEXT        NOT NULL DEFAULT 'active'
                           CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_status ON organizations (status);
