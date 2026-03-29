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
	('live'),
	('needs_review'),
	('to_be_discontinued')
ON CONFLICT ("status") DO NOTHING;

--> statement-breakpoint
INSERT INTO
	"organisational_unit_service_roles" ("role")
VALUES
	('service_owner'),
	('service_provider')
ON CONFLICT ("role") DO NOTHING;
