-- +migrate Up
CREATE TABLE rooms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(8) UNIQUE NOT NULL,
    game_type   VARCHAR(20) NOT NULL,
    host_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'waiting',
    settings    JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- +migrate Down
DROP TABLE rooms;
