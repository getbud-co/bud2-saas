ALTER TABLE tags ADD CONSTRAINT tags_org_id_unique UNIQUE (organization_id, id);

CREATE TABLE mission_tags (
    org_id     UUID        NOT NULL,
    mission_id UUID        NOT NULL,
    tag_id     UUID        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (org_id, mission_id, tag_id),
    FOREIGN KEY (org_id, mission_id)
        REFERENCES missions (organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (org_id, tag_id)
        REFERENCES tags (organization_id, id) ON DELETE CASCADE
);

CREATE INDEX idx_mission_tags_org_mission ON mission_tags (org_id, mission_id);
CREATE INDEX idx_mission_tags_org_tag     ON mission_tags (org_id, tag_id);
