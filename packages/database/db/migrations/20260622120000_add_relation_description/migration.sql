-- Optional free-text description on the person↔unit and unit↔unit relations. Nullable; no backfill.

ALTER TABLE "persons_to_organisational_units"
	ADD COLUMN IF NOT EXISTS "description" text;

ALTER TABLE "organisational_units_to_units"
	ADD COLUMN IF NOT EXISTS "description" text;
