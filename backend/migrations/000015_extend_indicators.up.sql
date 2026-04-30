ALTER TABLE indicators
    ADD COLUMN measurement_mode TEXT NOT NULL DEFAULT 'manual'
                                CHECK (measurement_mode IN ('manual', 'survey', 'task', 'mission', 'external')),
    ADD COLUMN goal_type        TEXT NOT NULL DEFAULT 'reach'
                                CHECK (goal_type IN ('reach', 'above', 'below', 'between', 'survey')),
    ADD COLUMN low_threshold    NUMERIC,
    ADD COLUMN high_threshold   NUMERIC,
    ADD COLUMN period_start     DATE,
    ADD COLUMN period_end       DATE,
    ADD COLUMN team_id          UUID,
    ADD COLUMN linked_survey_id UUID;

ALTER TABLE indicators
    ADD CONSTRAINT indicators_team_fk
        FOREIGN KEY (organization_id, team_id)
        REFERENCES teams (organization_id, id);
