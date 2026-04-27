CREATE TABLE tasks (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organizations(id),
    mission_id      UUID         NOT NULL,
    -- A task may live directly under a mission OR under one of its
    -- indicators. When indicator_id is set the UI shows it inside the
    -- indicator block; when null it shows in the mission's task list.
    -- mission_id is required either way so the cascade soft-delete and
    -- list-by-mission queries do not need to UNION two parents.
    indicator_id    UUID,
    assignee_id     UUID         NOT NULL,
    title           TEXT         NOT NULL,
    description     TEXT,
    status          TEXT         NOT NULL DEFAULT 'todo'
                                 CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- Composite FKs lock cross-tenant references — see the indicators
    -- migration for the same rationale. assignee resolves against
    -- organization_memberships so an out-of-org user cannot be assigned.
    FOREIGN KEY (organization_id, mission_id)
        REFERENCES missions (organization_id, id),
    FOREIGN KEY (organization_id, indicator_id)
        REFERENCES indicators (organization_id, id),
    FOREIGN KEY (organization_id, assignee_id)
        REFERENCES organization_memberships (organization_id, user_id)
);

CREATE INDEX idx_tasks_organization_id ON tasks (organization_id);
CREATE INDEX idx_tasks_assignee_id     ON tasks (assignee_id);
CREATE INDEX idx_tasks_status          ON tasks (status);
CREATE INDEX idx_tasks_deleted_at      ON tasks (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_org_mission_active
    ON tasks (organization_id, mission_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_indicator_id ON tasks (indicator_id) WHERE indicator_id IS NOT NULL;
