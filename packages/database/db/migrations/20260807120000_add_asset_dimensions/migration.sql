-- Record each image asset's pixel dimensions, so a consumer can build a responsive `srcset` whose
-- width descriptors are true. imgproxy does not enlarge, so asking for a width above the source's
-- own returns the source size instead; without knowing that size, a generated `srcset` advertises
-- candidates it cannot deliver, and the browser picks the largest, receives fewer pixels than the
-- descriptor promised, and renders it soft.
--
-- Stored as imgproxy renders them, with EXIF orientation already applied — imgproxy auto-rotates,
-- so for the quarter-turn orientations the displayed dimensions are the pixel buffer's swapped.
--
-- Nullable throughout: vector images have no raster resolution, and existing rows stay null until
-- `data:backfill:image-dimensions` measures the stored objects.
ALTER TABLE "assets"
	ADD COLUMN IF NOT EXISTS "width" integer;

--> statement-breakpoint

ALTER TABLE "assets"
	ADD COLUMN IF NOT EXISTS "height" integer;
