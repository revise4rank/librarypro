ALTER TABLE users
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(30);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_gender_check;

ALTER TABLE users
  ADD CONSTRAINT users_gender_check
  CHECK (
    gender IS NULL OR gender IN ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY')
  );
