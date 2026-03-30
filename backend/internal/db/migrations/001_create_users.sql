-- +migrate Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) UNIQUE NOT NULL,
    password_hash       VARCHAR(255),
    display_name        VARCHAR(50) NOT NULL,
    avatar_url          VARCHAR(500),
    oauth_provider      VARCHAR(20),
    oauth_id            VARCHAR(255),
    chips               BIGINT NOT NULL DEFAULT 1000,
    last_daily_bonus_at TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- +migrate Down
DROP TABLE users;
