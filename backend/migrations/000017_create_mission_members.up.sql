CREATE TABLE mission_members (
    org_id     UUID        NOT NULL,
    mission_id UUID        NOT NULL,
    user_id    UUID        NOT NULL,
    role       TEXT        NOT NULL DEFAULT 'supporter'
                           CHECK (role IN ('owner', 'supporter', 'observer')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (org_id, mission_id, user_id),
    FOREIGN KEY (org_id, mission_id)
        REFERENCES missions (organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (org_id, user_id)
        REFERENCES organization_memberships (organization_id, user_id)
);

CREATE INDEX idx_mission_members_org_mission ON mission_members (org_id, mission_id);
