CREATE TABLE indicators (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organizations(id),
    mission_id      UUID         NOT NULL,
    owner_id        UUID         NOT NULL,
    title           TEXT         NOT NULL,
    description     TEXT,
    target_value    NUMERIC,
    current_value   NUMERIC,
    unit            TEXT,
    status          TEXT         NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'active', 'at_risk', 'done', 'archived')),
    due_date        DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- Composite FKs lock cross-tenant references at the schema level: an
    -- indicator can only point at a mission of the same org and an owner
    -- with an active membership in that org.
    FOREIGN KEY (organization_id, mission_id)
        REFERENCES missions (organization_id, id),
    FOREIGN KEY (organization_id, owner_id)
        REFERENCES organization_memberships (organization_id, user_id)
);

CREATE INDEX idx_indicators_organization_id ON indicators (organization_id);
CREATE INDEX idx_indicators_owner_id        ON indicators (owner_id);
CREATE INDEX idx_indicators_status          ON indicators (status);
CREATE INDEX idx_indicators_deleted_at      ON indicators (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_indicators_org_mission_active
    ON indicators (organization_id, mission_id)
    WHERE deleted_at IS NULL;

-- Anchor for the composite FK from tasks(indicator_id) — see teams
-- migration for the same rationale.
ALTER TABLE indicators ADD CONSTRAINT indicators_org_id_key UNIQUE (organization_id, id);
