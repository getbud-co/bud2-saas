ALTER TABLE indicators
    DROP CONSTRAINT IF EXISTS indicators_team_fk,
    DROP COLUMN IF EXISTS measurement_mode,
    DROP COLUMN IF EXISTS goal_type,
    DROP COLUMN IF EXISTS low_threshold,
    DROP COLUMN IF EXISTS high_threshold,
    DROP COLUMN IF EXISTS period_start,
    DROP COLUMN IF EXISTS period_end,
    DROP COLUMN IF EXISTS team_id,
    DROP COLUMN IF EXISTS linked_survey_id;
