ALTER TABLE tasks ADD CONSTRAINT tasks_org_id_key UNIQUE (organization_id, id);

ALTER TABLE tasks
    ADD COLUMN parent_task_id          UUID,
    ADD COLUMN team_id                 UUID,
    ADD COLUMN contributes_to_mission_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE tasks
    ADD CONSTRAINT tasks_parent_task_fk
        FOREIGN KEY (organization_id, parent_task_id)
        REFERENCES tasks (organization_id, id)
        ON DELETE CASCADE,
    ADD CONSTRAINT tasks_team_fk
        FOREIGN KEY (organization_id, team_id)
        REFERENCES teams (organization_id, id);

CREATE INDEX tasks_parent_task_idx ON tasks (organization_id, parent_task_id)
    WHERE parent_task_id IS NOT NULL;
