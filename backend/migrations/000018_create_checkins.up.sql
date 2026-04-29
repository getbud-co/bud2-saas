CREATE TABLE checkins (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    org_id          UUID        NOT NULL,
    indicator_id    UUID        NOT NULL,
    author_id       UUID        NOT NULL,
    value           TEXT        NOT NULL,
    previous_value  TEXT,
    confidence      TEXT        NOT NULL DEFAULT 'medium'
                                CHECK (confidence IN ('high', 'medium', 'low', 'barrier', 'deprioritized')),
    note            TEXT,
    mentions        TEXT[]      NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    PRIMARY KEY (id),
    FOREIGN KEY (org_id, indicator_id)
        REFERENCES indicators (organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (org_id, author_id)
        REFERENCES organization_memberships (organization_id, user_id)
);

CREATE INDEX idx_checkins_org_indicator ON checkins (org_id, indicator_id, created_at DESC);
CREATE INDEX idx_checkins_org_author    ON checkins (org_id, author_id);
