INSERT INTO
	"person_role_types" ("type")
VALUES
	('dco_member'),
	('director'),
	('national_coordinator'),
	('national_coordinator_deputy'),
	('national_representative'),
	('national_representative_deputy'),
	('jrc_chair'),
	('jrc_member'),
	('scientific_board_member'),
	('smt_member'),
	('wg_chair'),
	('wg_member'),
	('national_consortium_contact'),
	('cooperating_partner_contact'),
	('ncc_chair');

--> statement-breakpoint
INSERT INTO
	"person_role_types_to_organisational_unit_types" ("role_type_id", "unit_type_id")
SELECT
	"role_types"."id",
	"unit_types"."id"
FROM
	(
		VALUES
			('dco_member', 'body'),
			('director', 'body'),
			('jrc_chair', 'body'),
			('jrc_member', 'body'),
			('scientific_board_member', 'body'),
			('ncc_chair', 'body'),
			('smt_member', 'body'),
			('national_coordinator', 'consortium'),
			('national_coordinator_deputy', 'consortium'),
			('national_representative', 'consortium'),
			('national_representative_deputy', 'consortium'),
			('national_consortium_contact', 'consortium'),
			('cooperating_partner_contact', 'consortium'),
			('wg_chair', 'working_group'),
			('wg_member', 'working_group')
	) AS "tmp" ("role_type", "unit_type")
	JOIN "person_role_types" "role_types" ON "role_types"."type" = "tmp"."role_type"
	JOIN "organisational_unit_types" "unit_types" ON "unit_types"."type" = "tmp"."unit_type"
ON CONFLICT ("role_type_id", "unit_type_id") DO NOTHING;
