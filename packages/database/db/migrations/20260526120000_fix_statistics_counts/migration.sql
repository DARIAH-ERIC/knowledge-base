DROP VIEW statistics;

--> statement-breakpoint
CREATE VIEW statistics AS
SELECT
	(
		-- Published countries with an active is_member_of relation to eric.
		SELECT COUNT(DISTINCT "units"."id")::integer
		FROM "organisational_units" "units"
			JOIN "entity_versions"
				ON "units"."id" = "entity_versions"."id"
			JOIN "document_lifecycle"
				ON "document_lifecycle"."published_id" = "entity_versions"."id"
			JOIN "organisational_unit_types" "unit_types"
				ON "units"."type_id" = "unit_types"."id"
				AND "unit_types"."type" = 'country'
			JOIN "organisational_units_to_units" "units_to_units"
				ON "units"."id" = "units_to_units"."unit_id"
				AND "units_to_units"."duration" @> NOW()
			JOIN "organisational_unit_status" "unit_status"
				ON "unit_status"."id" = "units_to_units"."status"
				AND "unit_status"."status" = 'is_member_of'
			JOIN "organisational_units" "related_units"
				ON "units_to_units"."related_unit_id" = "related_units"."id"
			JOIN "organisational_unit_types" "related_unit_types"
				ON "related_units"."type_id" = "related_unit_types"."id"
				AND "related_unit_types"."type" = 'eric'
	) AS "member_countries",
	(
		-- Published institutions with an active partner or national-coordinating relation to eric.
		SELECT COUNT(DISTINCT "units"."id")::integer
		FROM "organisational_units" "units"
			JOIN "entity_versions"
				ON "units"."id" = "entity_versions"."id"
			JOIN "document_lifecycle"
				ON "document_lifecycle"."published_id" = "entity_versions"."id"
			JOIN "organisational_unit_types" "unit_types"
				ON "units"."type_id" = "unit_types"."id"
				AND "unit_types"."type" = 'institution'
			JOIN "organisational_units_to_units" "units_to_units"
				ON "units"."id" = "units_to_units"."unit_id"
				AND "units_to_units"."duration" @> NOW()
			JOIN "organisational_unit_status" "unit_status"
				ON "unit_status"."id" = "units_to_units"."status"
				AND "unit_status"."status" IN (
					'is_partner_institution_of',
					'is_national_coordinating_institution_in'
				)
			JOIN "organisational_units" "related_units"
				ON "units_to_units"."related_unit_id" = "related_units"."id"
			JOIN "organisational_unit_types" "related_unit_types"
				ON "related_units"."type_id" = "related_unit_types"."id"
				AND "related_unit_types"."type" = 'eric'
	) AS "partner_institutions",
	(
		-- Published institutions with an active is_cooperating_partner_of relation to eric.
		SELECT COUNT(DISTINCT "units"."id")::integer
		FROM "organisational_units" "units"
			JOIN "entity_versions"
				ON "units"."id" = "entity_versions"."id"
			JOIN "document_lifecycle"
				ON "document_lifecycle"."published_id" = "entity_versions"."id"
			JOIN "organisational_unit_types" "unit_types"
				ON "units"."type_id" = "unit_types"."id"
				AND "unit_types"."type" = 'institution'
			JOIN "organisational_units_to_units" "units_to_units"
				ON "units"."id" = "units_to_units"."unit_id"
				AND "units_to_units"."duration" @> NOW()
			JOIN "organisational_unit_status" "unit_status"
				ON "unit_status"."id" = "units_to_units"."status"
				AND "unit_status"."status" = 'is_cooperating_partner_of'
			JOIN "organisational_units" "related_units"
				ON "units_to_units"."related_unit_id" = "related_units"."id"
			JOIN "organisational_unit_types" "related_unit_types"
				ON "related_units"."type_id" = "related_unit_types"."id"
				AND "related_unit_types"."type" = 'eric'
	) AS "cooperating_partners",
	(
		-- Published working groups with an active is_part_of relation to eric.
		SELECT COUNT(DISTINCT "units"."id")::integer
		FROM "organisational_units" "units"
			JOIN "entity_versions"
				ON "units"."id" = "entity_versions"."id"
			JOIN "document_lifecycle"
				ON "document_lifecycle"."published_id" = "entity_versions"."id"
			JOIN "organisational_unit_types" "unit_types"
				ON "units"."type_id" = "unit_types"."id"
				AND "unit_types"."type" = 'working_group'
			JOIN "organisational_units_to_units" "units_to_units"
				ON "units"."id" = "units_to_units"."unit_id"
				AND "units_to_units"."duration" @> NOW()
			JOIN "organisational_unit_status" "unit_status"
				ON "unit_status"."id" = "units_to_units"."status"
				AND "unit_status"."status" = 'is_part_of'
			JOIN "organisational_units" "related_units"
				ON "units_to_units"."related_unit_id" = "related_units"."id"
			JOIN "organisational_unit_types" "related_unit_types"
				ON "related_units"."type_id" = "related_unit_types"."id"
				AND "related_unit_types"."type" = 'eric'
	) AS "working_groups";
