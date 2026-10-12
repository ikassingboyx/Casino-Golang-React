-- Offline games belong to a single user.
ALTER TABLE games ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX idx_games_user_active ON games(user_id, game_type) WHERE status = 'active';
