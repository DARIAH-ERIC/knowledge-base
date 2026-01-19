INSERT INTO
	"content_blocks_types" ("type")
VALUES
	('data'),
	('embed'),
	('image'),
	('rich_text')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"content_blocks_type_data_types" ("type")
VALUES
	('events'),
	('news')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"entity_status" ("type")
VALUES
	('draft'),
	('published')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"entity_types" ("type")
VALUES
	('events'),
	('impact_case_studies'),
	('news'),
	('organisational_units'),
	('pages'),
	('persons'),
	('spotlight_articles')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"licenses" ("code", "name", "url")
VALUES
	(
		'CC0-1.0',
		'Creative Commons Zero v1.0 Universal',
		'https://creativecommons.org/publicdomain/zero/1.0/'
	),
	(
		'CC-BY-4.0',
		'Creative Commons Attribution 4.0 International',
		'https://creativecommons.org/licenses/by/4.0/'
	),
	(
		'CC-BY-NC-4.0',
		'Creative Commons Attribution Non Commercial 4.0 International',
		'https://creativecommons.org/licenses/by-nc/4.0/'
	),
	(
		'CC-BY-NC-ND-4.0',
		'Creative Commons Attribution Non Commercial No Derivatives 4.0 International',
		'https://creativecommons.org/licenses/by-nc-nd/4.0/'
	),
	(
		'CC-BY-NC-SA-4.0',
		'Creative Commons Attribution Non Commercial Share Alike 4.0 International',
		'https://creativecommons.org/licenses/by-nc-sa/4.0/'
	),
	(
		'CC-BY-ND-4.0',
		'Creative Commons Attribution No Derivatives 4.0 International',
		'https://creativecommons.org/licenses/by-nd/4.0/'
	),
	(
		'CC-BY-SA-4.0',
		'Creative Commons Attribution Share Alike 4.0 International',
		'https://creativecommons.org/licenses/by-sa/4.0/'
	)
ON CONFLICT ("code") DO NOTHING;
