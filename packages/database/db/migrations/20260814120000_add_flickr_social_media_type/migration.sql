-- `flickr` joins the outreach vocabulary: organisational units publish photo streams there, and the
-- channel is reported on like any other. Only `social_media_types` gains it — a person's own
-- accounts use `person_social_media_types`, which stays as it is.
--
-- The CHECK constraint is dropped and re-added rather than altered, since Postgres has no way to
-- widen one in place.

ALTER TABLE "social_media_types"
DROP CONSTRAINT IF EXISTS "social_media_types_type_enum_check";

--> statement-breakpoint

ALTER TABLE "social_media_types"
ADD CONSTRAINT "social_media_types_type_enum_check"
	CHECK ("type" IN ('bluesky', 'facebook', 'flickr', 'instagram', 'linkedin', 'mastodon', 'twitter', 'vimeo', 'website', 'youtube', 'other'));

--> statement-breakpoint

INSERT INTO "social_media_types" ("type")
VALUES
	('flickr')
ON CONFLICT ("type") DO NOTHING;
