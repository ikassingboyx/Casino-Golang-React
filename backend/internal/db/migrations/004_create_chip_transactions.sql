-- +migrate Up
CREATE TABLE chip_transactions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id       UUID REFERENCES games(id) ON DELETE SET NULL,
    amount        BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    description   VARCHAR(255),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chip_transactions_user_id ON chip_transactions(user_id);

-- +migrate Down
DROP TABLE chip_transactions;
