-- Humanities Commons and Hypotheses are profile platforms for researchers, so they join the
-- person-specific vocabulary without becoming outreach social media types.

ALTER TABLE "person_social_media_types"
DROP CONSTRAINT IF EXISTS "person_social_media_types_type_enum_check";

--> statement-breakpoint

ALTER TABLE "person_social_media_types"
ADD CONSTRAINT "person_social_media_types_type_enum_check"
	CHECK ("type" IN ('academia_edu', 'bluesky', 'github', 'gitlab', 'google_scholar', 'humanities_commons', 'hypotheses', 'linkedin', 'mastodon', 'researchgate', 'twitter', 'website', 'youtube', 'zenodo', 'other'));

--> statement-breakpoint

INSERT INTO "person_social_media_types" ("type")
VALUES
	('humanities_commons'),
	('hypotheses')
ON CONFLICT ("type") DO NOTHING;
