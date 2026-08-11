-- Give a gallery a caption of its own, describing the set of images rather than any one of them.
-- Until now the only captions a gallery carried were its items', which credit an individual image;
-- there was no place for the line that says what the gallery as a whole shows.
--
-- No `caption_mode` alongside it, unlike every image placement: a gallery is not a placement of one
-- asset, so it has no asset caption to inherit or suppress. Nullable, so every existing gallery
-- keeps rendering exactly as it does today until an editor writes one.
--
-- Re-running is a no-op.
ALTER TABLE "content_blocks_type_gallery"
	ADD COLUMN IF NOT EXISTS "caption" jsonb;
