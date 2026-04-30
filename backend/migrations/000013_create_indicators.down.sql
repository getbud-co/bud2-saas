-- indicators has FKs onto missions(id) and users(id). Run after
-- 000014_create_tasks.down.sql (tasks depends on missions, not on
-- indicators, but a coordinated rollback typically removes both child
-- tables before the parent). CASCADE drops any dependent objects (e.g.,
-- views) created out-of-band; safe because the table has no out-of-tree
-- consumers in this repository.
DROP TABLE IF EXISTS indicators CASCADE;
