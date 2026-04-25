CREATE TABLE cycles (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id         UUID        NOT NULL REFERENCES organizations(id),
    name                    TEXT        NOT NULL,
    type                    TEXT        NOT NULL CHECK (type IN ('quarterly', 'semi_annual', 'annual', 'custom')),
    start_date              DATE        NOT NULL,
    end_date                DATE        NOT NULL,
    status                  TEXT        NOT NULL DEFAULT 'planning'
                                        CHECK (status IN ('planning', 'active', 'review', 'ended', 'archived')),
    okr_definition_deadline DATE,
    mid_review_date         DATE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at              TIMESTAMPTZ,
    CHECK (end_date >= start_date),
    CHECK (okr_definition_deadline IS NULL OR (okr_definition_deadline >= start_date AND okr_definition_deadline <= end_date)),
    CHECK (mid_review_date IS NULL OR (mid_review_date >= start_date AND mid_review_date <= end_date))
);

CREATE INDEX idx_cycles_organization_id ON cycles (organization_id);
CREATE INDEX idx_cycles_status ON cycles (status);
CREATE INDEX idx_cycles_type ON cycles (type);
CREATE INDEX idx_cycles_deleted_at ON cycles (deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_cycles_org_name_unique ON cycles (organization_id, LOWER(name)) WHERE deleted_at IS NULL;
