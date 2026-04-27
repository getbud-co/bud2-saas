CREATE TABLE teams (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL REFERENCES organizations(id),
    name            TEXT        NOT NULL,
    description     TEXT,
    color           TEXT        NOT NULL DEFAULT 'neutral'
                                CHECK (color IN ('neutral', 'orange', 'wine', 'caramel', 'success', 'warning', 'error')),
    status          TEXT        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'archived')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_teams_organization_id ON teams (organization_id);
CREATE INDEX idx_teams_status ON teams (status);
CREATE INDEX idx_teams_deleted_at ON teams (deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_teams_org_name_unique ON teams (organization_id, LOWER(name)) WHERE deleted_at IS NULL;

-- Anchor for composite FKs targeting (organization_id, id). Redundant with
-- the PK on id alone, but Postgres requires the exact set of referenced
-- columns to have a UNIQUE/PK index.
ALTER TABLE teams ADD CONSTRAINT teams_org_id_key UNIQUE (organization_id, id);

CREATE TABLE team_members (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL,
    team_id         UUID        NOT NULL,
    user_id         UUID        NOT NULL,
    role_in_team    TEXT        NOT NULL DEFAULT 'member'
                                CHECK (role_in_team IN ('leader', 'member', 'observer')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    -- Composite FKs ensure team_members can only point at a team in the
    -- same organization AND a user that has an active membership there.
    -- The DB now blocks the cross-tenant case the app layer already
    -- rejects, so any future bypass (admin script, batch import) cannot
    -- corrupt the tenancy graph.
    FOREIGN KEY (organization_id, team_id)
        REFERENCES teams (organization_id, id),
    FOREIGN KEY (organization_id, user_id)
        REFERENCES organization_memberships (organization_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members (team_id);
CREATE INDEX idx_team_members_user_id ON team_members (user_id);
CREATE INDEX idx_team_members_organization_id ON team_members (organization_id);
CREATE INDEX idx_team_members_deleted_at ON team_members (deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_team_members_team_user_unique ON team_members (team_id, user_id) WHERE deleted_at IS NULL;
