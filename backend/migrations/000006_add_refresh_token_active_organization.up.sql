ALTER TABLE refresh_tokens
ADD COLUMN active_organization_id UUID;

-- (active_organization_id, user_id) must point at an existing membership in
-- the same org. NULL active_organization_id is allowed (means "no active
-- org yet"); MATCH SIMPLE (the default) skips FK enforcement when any
-- column is NULL. ON DELETE CASCADE: removing a user's membership tears
-- down their refresh tokens for that org, which is the safer default
-- (better than leaving stale active_organization_id pointing at an org
-- they no longer belong to).
ALTER TABLE refresh_tokens
ADD CONSTRAINT refresh_tokens_org_user_membership_fkey
    FOREIGN KEY (active_organization_id, user_id)
    REFERENCES organization_memberships (organization_id, user_id)
    ON DELETE CASCADE;

CREATE INDEX idx_refresh_tokens_active_organization_id ON refresh_tokens(active_organization_id)
WHERE active_organization_id IS NOT NULL;
