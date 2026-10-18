DROP INDEX idx_rooms_open_code;
ALTER TABLE rooms ADD CONSTRAINT rooms_code_key UNIQUE (code);
