-- Unique index on lower(email) excluding soft-deleted rows so that
-- the same email address can be reused after a user is soft-deleted.
CREATE UNIQUE INDEX idx_users_email ON users (LOWER(email)) WHERE deleted_at IS NULL;
