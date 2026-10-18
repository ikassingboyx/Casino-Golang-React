-- Room codes are short (5 digits) and reused, so they only need to be unique
-- among rooms that are still open.
ALTER TABLE rooms DROP CONSTRAINT rooms_code_key;
CREATE UNIQUE INDEX idx_rooms_open_code ON rooms(code) WHERE status <> 'finished';
