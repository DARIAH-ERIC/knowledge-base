CREATE VIEW members_and_partners AS
-- Countries with a direct member or observer relation to eric
SELECT
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
	"units"."updated_at",
	"units"."image_id",
	"units"."sshoc_marketplace_actor_id",
	"unit_types"."type",
	"unit_status"."status"
FROM
	"organisational_units" "units"
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id"
	AND "unit_types"."type" = 'country'
	JOIN "organisational_units_to_units" "units_to_units" ON "units"."id" = "units_to_units"."unit_id"
	AND "units_to_units"."duration" @> NOW()
	JOIN "organisational_unit_status" "unit_status" ON "unit_status"."id" = "units_to_units"."status"
	AND "unit_status"."status" IN ('is_member_of', 'is_observer_of')
	JOIN "organisational_units" "related_units" ON "units_to_units"."related_unit_id" = "related_units"."id"
	JOIN "organisational_unit_types" "related_unit_types" ON "related_units"."type_id" = "related_unit_types"."id"
	AND "related_unit_types"."type" = 'eric'
GROUP BY
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
	"units"."updated_at",
	"unit_types"."type",
	"units"."image_id",
	"units"."sshoc_marketplace_actor_id",
	"unit_status"."status"

UNION

-- Countries that have at least one cooperating partner institution located in them
SELECT
	"countries"."id",
	"countries"."metadata",
	"countries"."name",
	"countries"."summary",
	"countries"."updated_at",
	"countries"."image_id",
	"countries"."sshoc_marketplace_actor_id",
	"country_types"."type",
	"coop_status"."status"
FROM
	"organisational_units" "countries"
	JOIN "organisational_unit_types" "country_types" ON "countries"."type_id" = "country_types"."id"
	AND "country_types"."type" = 'country'
	JOIN "organisational_units_to_units" "located_in" ON "countries"."id" = "located_in"."related_unit_id"
	AND "located_in"."duration" @> NOW()
	JOIN "organisational_unit_status" "located_in_status" ON "located_in_status"."id" = "located_in"."status"
	AND "located_in_status"."status" = 'is_located_in'
	JOIN "organisational_units" "institutions" ON "institutions"."id" = "located_in"."unit_id"
	JOIN "organisational_unit_types" "institution_types" ON "institutions"."type_id" = "institution_types"."id"
	AND "institution_types"."type" = 'institution'
	JOIN "organisational_units_to_units" "coop_rel" ON "institutions"."id" = "coop_rel"."unit_id"
	AND "coop_rel"."duration" @> NOW()
	JOIN "organisational_unit_status" "coop_status" ON "coop_status"."id" = "coop_rel"."status"
	AND "coop_status"."status" = 'is_cooperating_partner_of'
	JOIN "organisational_units" "eric_units" ON "coop_rel"."related_unit_id" = "eric_units"."id"
	JOIN "organisational_unit_types" "eric_types" ON "eric_units"."type_id" = "eric_types"."id"
	AND "eric_types"."type" = 'eric'
GROUP BY
	"countries"."id",
	"countries"."metadata",
	"countries"."name",
	"countries"."summary",
	"countries"."updated_at",
	"country_types"."type",
	"countries"."image_id",
	"countries"."sshoc_marketplace_actor_id",
	"coop_status"."status";


--> statement-breakpoint
CREATE VIEW working_groups AS
SELECT
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
	"units"."updated_at",
	"units"."image_id",
	"units"."sshoc_marketplace_actor_id",
	"unit_types"."type",
	"unit_status"."status"
FROM
	"organisational_units" "units"
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id"
	AND "unit_types"."type" = 'working_group'
	JOIN "organisational_units_to_units" "units_to_units" ON "units"."id" = "units_to_units"."unit_id"
	JOIN "organisational_unit_status" "unit_status" ON "unit_status"."id" = "units_to_units"."status"
GROUP BY
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
	"units"."updated_at",
	"unit_types"."type",
	"units"."image_id",
	"units"."sshoc_marketplace_actor_id",
	"unit_status"."status";

--> statement-breakpoint
CREATE VIEW dariah_projects AS
SELECT DISTINCT
	"projects"."id",
	"projects"."metadata",
	"projects"."name",
	"projects"."summary",
	"projects"."duration",
	"projects"."call",
	"projects"."topic",
	"projects"."funding",
	"projects"."image_id",
	"projects"."scope_id",
	"projects"."created_at",
	"projects"."updated_at"
FROM
	"projects"
	JOIN "projects_to_organisational_units" ON "projects_to_organisational_units"."project_id" = "projects"."id"
	JOIN "organisational_units" ON "organisational_units"."id" = "projects_to_organisational_units"."unit_id"
	JOIN "organisational_unit_types" ON "organisational_unit_types"."id" = "organisational_units"."type_id"
	AND "organisational_unit_types"."type" = 'eric'
	JOIN "project_roles" ON "project_roles"."id" = "projects_to_organisational_units"."role_id"
	AND "project_roles"."role" IN ('coordinator', 'participant');

--> statement-breakpoint
CREATE VIEW statistics AS
SELECT
  (
    -- Countries with an active is_member_of relation to eric
    SELECT COUNT(*)::integer
    FROM "organisational_units" u
    JOIN "organisational_unit_types" t ON u."type_id" = t."id" AND t."type" = 'country'
    JOIN "organisational_units_to_units" r ON u."id" = r."unit_id" AND r."duration" @> NOW()
    JOIN "organisational_unit_status" s ON r."status" = s."id" AND s."status" = 'is_member_of'
    JOIN "organisational_units" related ON r."related_unit_id" = related."id"
    JOIN "organisational_unit_types" related_t ON related."type_id" = related_t."id" AND related_t."type" = 'eric'
  ) AS "member_countries",
  (
    -- Institutions with an active partner or national-coordinating relation to eric
    SELECT COUNT(*)::integer
    FROM "organisational_units" u
    JOIN "organisational_unit_types" t ON u."type_id" = t."id" AND t."type" = 'institution'
    JOIN "organisational_units_to_units" r ON u."id" = r."unit_id" AND r."duration" @> NOW()
    JOIN "organisational_unit_status" s ON r."status" = s."id" AND s."status" IN (
      'is_partner_institution_of',
      'is_national_coordinating_institution_in'
    )
    JOIN "organisational_units" umb ON r."related_unit_id" = umb."id"
    JOIN "organisational_unit_types" umb_t ON umb."type_id" = umb_t."id" AND umb_t."type" = 'eric'
  ) AS "partner_institutions",
  (
    -- Institutions with an active is_cooperating_partner_of relation to eric
    SELECT COUNT(*)::integer
    FROM "organisational_units" u
    JOIN "organisational_unit_types" t ON u."type_id" = t."id" AND t."type" = 'institution'
    JOIN "organisational_units_to_units" r ON u."id" = r."unit_id" AND r."duration" @> NOW()
    JOIN "organisational_unit_status" s ON r."status" = s."id" AND s."status" = 'is_cooperating_partner_of'
    JOIN "organisational_units" umb ON r."related_unit_id" = umb."id"
    JOIN "organisational_unit_types" umb_t ON umb."type_id" = umb_t."id" AND umb_t."type" = 'eric'
  ) AS "cooperating_partners",
  (
    -- Working groups with an active is_part_of relation to eric
    SELECT COUNT(*)::integer
    FROM "organisational_units" u
    JOIN "organisational_unit_types" t ON u."type_id" = t."id" AND t."type" = 'working_group'
    JOIN "organisational_units_to_units" r ON u."id" = r."unit_id" AND r."duration" @> NOW()
    JOIN "organisational_unit_status" s ON r."status" = s."id" AND s."status" = 'is_part_of'
    JOIN "organisational_units" related ON r."related_unit_id" = related."id"
    JOIN "organisational_unit_types" related_t ON related."type_id" = related_t."id" AND related_t."type" = 'eric'
  ) AS "working_groups";
