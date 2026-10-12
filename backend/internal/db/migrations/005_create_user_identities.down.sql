ALTER TABLE users
    ADD COLUMN oauth_provider VARCHAR(20),
    ADD COLUMN oauth_id       VARCHAR(255);

ALTER TABLE users ALTER COLUMN email SET NOT NULL;

DROP TABLE user_identities;
