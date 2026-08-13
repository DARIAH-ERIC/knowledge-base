-- Persons get their own social media (personal website, Bluesky, GitHub, …). These are rows owned by
-- a single person version rather than entries in the shared `social_media` table: person handles are
-- never shared between owners, carry no `duration`, and must stay unreachable from the outreach
-- reporting tables, which all reference `social_media.id`.
--
-- `email` and `orcid` stay as columns on `persons`: an inbound contact channel and an identifier
-- respectively, neither of which is an account on a platform.
--
-- The vocabulary is its own table rather than a filtered view of `social_media_types`. The two sets
-- overlap but neither contains the other — `google_scholar`/`researchgate`/`zenodo` are person-only,
-- `facebook`/`instagram`/`vimeo` are outreach-only — so keeping them apart makes "a Google Scholar
-- profile is not an outreach channel" a foreign key rather than a rule every picker has to apply.

CREATE TABLE IF NOT EXISTS "person_social_media_types" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT UUIDV7(),
	"type" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_social_media_types_type_enum_check"
		CHECK ("type" IN ('academia_edu', 'bluesky', 'github', 'gitlab', 'google_scholar', 'linkedin', 'mastodon', 'researchgate', 'twitter', 'website', 'youtube', 'zenodo', 'other'))
);

--> statement-breakpoint

INSERT INTO "person_social_media_types" ("type")
VALUES
	('academia_edu'),
	('bluesky'),
	('github'),
	('gitlab'),
	('google_scholar'),
	('linkedin'),
	('mastodon'),
	('researchgate'),
	('twitter'),
	('website'),
	('youtube'),
	('zenodo'),
	('other')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint

-- The unique constraint is scoped to `person_id`, which is a version id, so a draft and its
-- published copy can hold the same url. Its index also serves lookups by person.
CREATE TABLE IF NOT EXISTS "person_social_media" (
	"id" uuid PRIMARY KEY NOT NULL DEFAULT UUIDV7(),
	"person_id" uuid NOT NULL REFERENCES "persons"("id"),
	"type_id" uuid NOT NULL REFERENCES "person_social_media_types"("id"),
	"url" text NOT NULL,
	"label" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "person_social_media_person_id_url_unique" UNIQUE ("person_id", "url")
);
