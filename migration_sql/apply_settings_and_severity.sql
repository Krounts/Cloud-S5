-- Create settings table if missing and insert default price_per_m2
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR PRIMARY KEY,
  value VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default price_per_m2 (adjust value as needed)
INSERT INTO settings(key, value) VALUES ('price_per_m2', '35000')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Add severity_level to reports if missing
ALTER TABLE reports ADD COLUMN IF NOT EXISTS severity_level INTEGER DEFAULT 1;
ALTER TABLE reports ALTER COLUMN severity_level SET DEFAULT 1;

-- Add a CHECK constraint for severity (1..10) if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_severity_level_check'
  ) THEN
    ALTER TABLE reports ADD CONSTRAINT reports_severity_level_check CHECK (severity_level BETWEEN 1 AND 10);
  END IF;
END$$;
