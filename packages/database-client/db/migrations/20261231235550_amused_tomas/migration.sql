INSERT INTO
	"content_block_types" ("type")
VALUES
	("data"),
	("embed"),
	("image"),
	("rich_text")
ON CONFLICT DO NOTHING;

INSERT INTO
	"content_blocks_type_data_types" ("type")
VALUES
	("events"),
	("news")
ON CONFLICT DO NOTHING;

INSERT INTO
	"entity_status" ("type")
VALUES
	("draft"),
	("published")
ON CONFLICT DO NOTHING;

INSERT INTO
	"entity_types" ("type")
VALUES
	("events"),
	("impact_case_studies"),
	("news"),
	("pages"),
	("persons"),
	("spotlight_articles")
ON CONFLICT DO NOTHING;
