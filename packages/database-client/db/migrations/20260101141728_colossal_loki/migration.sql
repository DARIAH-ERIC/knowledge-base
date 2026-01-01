INSERT INTO
	"content_blocks_types" ("type")
VALUES
	('data'),
	('embed'),
	('image'),
	('rich_text')
ON CONFLICT ("type") DO NOTHING;

INSERT INTO
	"content_blocks_type_data_types" ("type")
VALUES
	('events'),
	('news')
ON CONFLICT ("type") DO NOTHING;

INSERT INTO
	"entity_status" ("type")
VALUES
	('draft'),
	('published')
ON CONFLICT ("type") DO NOTHING;

INSERT INTO
	"entity_types" ("type")
VALUES
	('events'),
	('impact_case_studies'),
	('news'),
	('pages'),
	('persons'),
	('spotlight_articles')
ON CONFLICT ("type") DO NOTHING;

INSERT INTO
	"licenses" ("name", "url")
VALUES
	(
		'CC0 1.0',
		'https://creativecommons.org/publicdomain/zero/1.0/'
	),
	(
		'CC BY 4.0',
		'https://creativecommons.org/licenses/by/4.0/'
	),
	(
		'CC BY-SA 4.0',
		'https://creativecommons.org/licenses/by-sa/4.0/'
	),
	(
		'CC BY-NC-SA 4.0',
		'https://creativecommons.org/licenses/by-nc-sa/4.0/'
	)
ON CONFLICT ("name") DO NOTHING;
