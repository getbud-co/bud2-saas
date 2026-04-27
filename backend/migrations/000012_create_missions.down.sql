-- CASCADE so future child tables (key_results, mission_tasks, etc.) that FK
-- back to missions can be torn down together if the rollback runs after they
-- exist. As of 2026-04-25 there are no such tables yet.
DROP TABLE IF EXISTS missions CASCADE;
