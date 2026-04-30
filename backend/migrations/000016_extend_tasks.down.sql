DROP INDEX IF EXISTS tasks_parent_task_idx;

ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS tasks_team_fk,
    DROP CONSTRAINT IF EXISTS tasks_parent_task_fk,
    DROP COLUMN IF EXISTS contributes_to_mission_ids,
    DROP COLUMN IF EXISTS team_id,
    DROP COLUMN IF EXISTS parent_task_id,
    DROP CONSTRAINT IF EXISTS tasks_org_id_key;
