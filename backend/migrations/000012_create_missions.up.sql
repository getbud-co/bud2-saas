CREATE TABLE missions (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID         NOT NULL REFERENCES organizations(id),
    cycle_id        UUID,
    parent_id       UUID,
    owner_id        UUID         NOT NULL,
    team_id         UUID,
    title           TEXT         NOT NULL,
    description     TEXT,
    status          TEXT         NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    visibility      TEXT         NOT NULL DEFAULT 'public'
                                 CHECK (visibility IN ('public', 'team_only', 'private')),
    kanban_status   TEXT         NOT NULL DEFAULT 'uncategorized'
                                 CHECK (kanban_status IN ('uncategorized', 'todo', 'doing', 'done')),
    sort_order      INTEGER      NOT NULL DEFAULT 0,
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- All cross-tenant references go through composite FKs anchored on
    -- organization_id, so a mission cannot reference a cycle, parent
    -- mission, team, or owner from a different org. Defense in depth:
    -- the application use cases already validate org consistency; these
    -- constraints close the door for any path that bypasses the use case
    -- (admin scripts, batch imports, future maintenance jobs).
    -- owner_id resolves against organization_memberships rather than
    -- users(id) so the user must additionally be a current member.
    UNIQUE (organization_id, id),
    FOREIGN KEY (organization_id, cycle_id)
        REFERENCES cycles (organization_id, id),
    FOREIGN KEY (organization_id, parent_id)
        REFERENCES missions (organization_id, id),
    FOREIGN KEY (organization_id, team_id)
        REFERENCES teams (organization_id, id),
    FOREIGN KEY (organization_id, owner_id)
        REFERENCES organization_memberships (organization_id, user_id)
);

CREATE INDEX idx_missions_organization_id ON missions (organization_id);
CREATE INDEX idx_missions_cycle_id        ON missions (cycle_id);
CREATE INDEX idx_missions_parent_id       ON missions (parent_id);
CREATE INDEX idx_missions_owner_id        ON missions (owner_id);
CREATE INDEX idx_missions_team_id         ON missions (team_id);
CREATE INDEX idx_missions_status          ON missions (status);
CREATE INDEX idx_missions_deleted_at      ON missions (deleted_at) WHERE deleted_at IS NULL;

-- Composite partial index for the primary tree-view query
-- (root listing: WHERE organization_id = ? AND parent_id IS NULL AND deleted_at IS NULL).
-- Also covers WHERE organization_id = ? AND parent_id = ? for sibling queries.
CREATE INDEX idx_missions_org_parent_active
    ON missions (organization_id, parent_id)
    WHERE deleted_at IS NULL;
