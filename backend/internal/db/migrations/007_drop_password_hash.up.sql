-- Sign-in is only through Google, Facebook and GitHub.
ALTER TABLE users DROP COLUMN password_hash;
