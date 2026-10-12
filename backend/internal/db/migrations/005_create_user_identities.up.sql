-- A user can sign in with several providers (Google, Facebook, GitHub);
-- each linked login is one row here.
CREATE TABLE user_identities (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         VARCHAR(20) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_user_id)
);

CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);

-- Some providers (e.g. Facebook) may not share an email.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users
    DROP COLUMN oauth_provider,
    DROP COLUMN oauth_id;
