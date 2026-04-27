CREATE TABLE indicators (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organizations(id),
    mission_id      UUID         NOT NULL REFERENCES missions(id),
    owner_id        UUID         NOT NULL REFERENCES users(id),
    title           TEXT         NOT NULL,
    description     TEXT,
    target_value    NUMERIC,
    current_value   NUMERIC,
    unit            TEXT,
    status          TEXT         NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'active', 'at_risk', 'done', 'archived')),
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    due_date        DATE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_indicators_organization_id ON indicators (organization_id);
CREATE INDEX idx_indicators_owner_id        ON indicators (owner_id);
CREATE INDEX idx_indicators_status          ON indicators (status);
CREATE INDEX idx_indicators_deleted_at      ON indicators (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_indicators_org_mission_active
    ON indicators (organization_id, mission_id)
    WHERE deleted_at IS NULL;
