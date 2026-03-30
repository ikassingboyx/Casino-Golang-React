-- +migrate Up
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id     UUID REFERENCES rooms(id) ON DELETE SET NULL,
    game_type   VARCHAR(20) NOT NULL,
    state       JSONB NOT NULL,
    is_offline  BOOLEAN NOT NULL DEFAULT FALSE,
    status      VARCHAR(20) NOT NULL DEFAULT 'active',
    started_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMP
);

-- +migrate Down
DROP TABLE games;
