-- Convert plaintext caption columns to Tiptap richtext (jsonb). Existing non-empty plaintext is
-- wrapped into a single-paragraph document so it renders identically; null/blank becomes NULL.
--
-- Each conversion is guarded on the resolved relation's `caption` column still being `text`, so the
-- migration is idempotent and safe to run after `db:push` has already changed the column type to
-- jsonb (re-running `btrim()` on a jsonb column would otherwise fail with "function btrim(jsonb)
-- does not exist"). The type check is bound to the same relation the ALTER targets (via
-- `to_regclass`) so it can't be fooled by a same-named table in another schema.

DO $$
DECLARE
	target text;
	rel oid;
	coltype text;
BEGIN
	FOREACH target IN ARRAY ARRAY[
		'assets',
		'content_blocks_type_image',
		'content_blocks_type_embed',
		'content_blocks_type_gallery_items'
	]
	LOOP
		rel := to_regclass(quote_ident(target));

		IF rel IS NULL THEN
			CONTINUE;
		END IF;

		SELECT atttypid::regtype::text
		INTO coltype
		FROM pg_attribute
		WHERE attrelid = rel
			AND attname = 'caption'
			AND NOT attisdropped;

		IF coltype = 'text' THEN
			EXECUTE format(
				$fmt$
					ALTER TABLE %I
						ALTER COLUMN caption TYPE jsonb USING (
							CASE
								WHEN caption IS NULL OR btrim(caption) = '' THEN NULL
								ELSE jsonb_build_object(
									'type', 'doc',
									'content', jsonb_build_array(
										jsonb_build_object(
											'type', 'paragraph',
											'content', jsonb_build_array(
												jsonb_build_object('type', 'text', 'text', caption)
											)
										)
									)
								)
							END
						)
				$fmt$,
				target
			);
		END IF;
	END LOOP;
END $$;
