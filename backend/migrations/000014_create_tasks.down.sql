-- tasks has FKs onto missions(id) and users(id). Run before
-- 000013_create_indicators.down.sql is irrelevant (independent FKs); but
-- 000012_create_missions.down.sql must run AFTER both this and the
-- indicators down migration, otherwise the missions DROP fails with FK
-- violations.
DROP TABLE IF EXISTS tasks CASCADE;
