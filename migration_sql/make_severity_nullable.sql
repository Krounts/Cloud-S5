-- Make severity_level nullable and remove default so manager must set it explicitly
ALTER TABLE reports ALTER COLUMN severity_level DROP DEFAULT;
-- Allow NULL values
ALTER TABLE reports ALTER COLUMN severity_level DROP NOT NULL;
-- Optionally update existing rows with 0 or keep as-is; we leave existing values untouched.
-- Ensure check constraint allows NULL (no action needed since CHECK returns NULL for NULL values)
