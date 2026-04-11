DROP VIEW members_and_partners;

--> statement-breakpoint
CREATE VIEW members_and_partners AS
-- Countries with a direct member or observer relation to eric
SELECT
	"units"."id",
	"units"."metadata",
	"units"."name",
	"units"."summary",
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
	"country_types"."type",
	"countries"."image_id",
	"countries"."sshoc_marketplace_actor_id",
	"coop_status"."status";
