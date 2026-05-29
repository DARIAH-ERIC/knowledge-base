ALTER TABLE organisational_units ADD COLUMN IF NOT EXISTS ror text;

UPDATE organisational_units
SET ror = metadata->>'ror'
WHERE metadata->>'ror' IS NOT NULL;
