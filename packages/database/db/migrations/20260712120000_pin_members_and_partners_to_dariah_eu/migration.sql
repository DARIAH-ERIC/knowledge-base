-- The members_and_partners view accepted a relation to any published eric, while the statistics
-- view (and every relation filter in the apps) explicitly targets the eric with slug 'dariah-eu'.
-- With more than one eric in the database the two disagreed; pin both UNION branches to dariah-eu
-- so membership always means membership in DARIAH-EU.

CREATE OR REPLACE VIEW members_and_partners AS
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
	JOIN "entity_versions" "units_v" ON "units_v"."id" = "units"."id"
	JOIN "entity_status" "units_s" ON "units_s"."id" = "units_v"."status_id" AND "units_s"."type" = 'published'
	JOIN "organisational_unit_types" "unit_types" ON "units"."type_id" = "unit_types"."id" AND "unit_types"."type" = 'country'
	JOIN "organisational_units_to_units" "units_to_units" ON "units_to_units"."unit_document_id" = "units_v"."entity_id" AND "units_to_units"."duration" @> NOW()
	JOIN "organisational_unit_status" "unit_status" ON "unit_status"."id" = "units_to_units"."status" AND "unit_status"."status" IN ('is_member_of', 'is_observer_of')
	JOIN "entity_versions" "related_v" ON "related_v"."entity_id" = "units_to_units"."related_unit_document_id"
	JOIN "entity_status" "related_s" ON "related_s"."id" = "related_v"."status_id" AND "related_s"."type" = 'published'
	JOIN "organisational_units" "related_units" ON "related_units"."id" = "related_v"."id"
	JOIN "organisational_unit_types" "related_unit_types" ON "related_units"."type_id" = "related_unit_types"."id" AND "related_unit_types"."type" = 'eric'
	JOIN "entities" "eric_entities" ON "eric_entities"."id" = "units_to_units"."related_unit_document_id" AND "eric_entities"."slug" = 'dariah-eu'
GROUP BY
	"units"."id", "units"."metadata", "units"."name", "units"."summary", "units"."updated_at",
	"unit_types"."type", "units"."image_id", "units"."sshoc_marketplace_actor_id", "unit_status"."status"
UNION
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
	JOIN "entity_versions" "countries_v" ON "countries_v"."id" = "countries"."id"
	JOIN "entity_status" "countries_s" ON "countries_s"."id" = "countries_v"."status_id" AND "countries_s"."type" = 'published'
	JOIN "organisational_unit_types" "country_types" ON "countries"."type_id" = "country_types"."id" AND "country_types"."type" = 'country'
	JOIN "organisational_units_to_units" "located_in" ON "located_in"."related_unit_document_id" = "countries_v"."entity_id" AND "located_in"."duration" @> NOW()
	JOIN "organisational_unit_status" "located_in_status" ON "located_in_status"."id" = "located_in"."status" AND "located_in_status"."status" = 'is_located_in'
	JOIN "entity_versions" "institutions_v" ON "institutions_v"."entity_id" = "located_in"."unit_document_id"
	JOIN "entity_status" "institutions_s" ON "institutions_s"."id" = "institutions_v"."status_id" AND "institutions_s"."type" = 'published'
	JOIN "organisational_units" "institutions" ON "institutions"."id" = "institutions_v"."id"
	JOIN "organisational_unit_types" "institution_types" ON "institutions"."type_id" = "institution_types"."id" AND "institution_types"."type" = 'institution'
	JOIN "organisational_units_to_units" "coop_rel" ON "coop_rel"."unit_document_id" = "institutions_v"."entity_id" AND "coop_rel"."duration" @> NOW()
	JOIN "organisational_unit_status" "coop_status" ON "coop_status"."id" = "coop_rel"."status" AND "coop_status"."status" = 'is_cooperating_partner_of'
	JOIN "entity_versions" "eric_v" ON "eric_v"."entity_id" = "coop_rel"."related_unit_document_id"
	JOIN "entity_status" "eric_s" ON "eric_s"."id" = "eric_v"."status_id" AND "eric_s"."type" = 'published'
	JOIN "organisational_units" "eric_units" ON "eric_units"."id" = "eric_v"."id"
	JOIN "organisational_unit_types" "eric_types" ON "eric_units"."type_id" = "eric_types"."id" AND "eric_types"."type" = 'eric'
	JOIN "entities" "eric_entities" ON "eric_entities"."id" = "coop_rel"."related_unit_document_id" AND "eric_entities"."slug" = 'dariah-eu'
GROUP BY
	"countries"."id", "countries"."metadata", "countries"."name", "countries"."summary", "countries"."updated_at",
	"country_types"."type", "countries"."image_id", "countries"."sshoc_marketplace_actor_id", "coop_status"."status";
