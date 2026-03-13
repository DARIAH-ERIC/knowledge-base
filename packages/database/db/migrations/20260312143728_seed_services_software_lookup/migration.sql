INSERT INTO
	"service_types" ("type")
VALUES
	('community'),
	('core'),
	('internal')
ON CONFLICT ("type") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"service_statuses" ("status")
VALUES
	('discontinued'),
	('in_preparation'),
	('live'),
	('needs_review'),
	('to_be_discontinued')
ON CONFLICT ("status") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"software_statuses" ("status")
VALUES
	('maintained'),
	('needs_review'),
	('not_maintained')
ON CONFLICT ("status") DO NOTHING;
