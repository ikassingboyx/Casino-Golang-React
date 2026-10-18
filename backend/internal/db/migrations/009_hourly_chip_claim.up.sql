-- The once-a-day bonus became an hourly chip top-up claimed from the profile.
ALTER TABLE users RENAME COLUMN last_daily_bonus_at TO last_chip_claim_at;
