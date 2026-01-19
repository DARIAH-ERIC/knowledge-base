INSERT INTO
	"organisational_unit_types" ("type")
VALUES
	('body'),
	('consortium'),
	('institution'),
	('regional_hub'),
	('umbrella_consortium')

--> statement-breakpoint
INSERT INTO
	"organisational_unit_status" ("status")
VALUES
	('is_cooperating_partner'),
	('is_member'),
	('is_national_coordinating_institution'),
	('is_national_representative_institution'),
	('is_partner_institution')

--> statement-breakpoint
INSERT INTO
        "organisational_units_allowed_relations" ("unit_type_id", "related_unit_type_id", "relation_type_id")
SELECT
        unit_types.id, related_unit_types.id, relation_types.id
FROM (
        VALUES
        (
                'consortium',
                'umbrella_consortium',
                'is_member'
        ),
        (
                'consortium',
                'umbrella_consortium',
                'is_cooperating_partner'
        ),
        (
                'institution',
                'consortium',
                'is_national_coordinating_institution'
        ),
        (
                'institution',
                'consortium',
                'is_national_representative_institution'
        ),
        (
                'institution',
                'consortium',
                'is_partner_institution'
        ),
        (
                'consortium',
                'regional_hub',
                'is_member'
        )
) as tmp(unit_type, related_unit_type, relation_type)
JOIN organisational_unit_types unit_types on unit_types.type = tmp.unit_type
JOIN organisational_unit_types related_unit_types on related_unit_types.type = tmp.related_unit_type
JOIN organisational_unit_status relation_types on relation_types.status = tmp.relation_type
ON CONFLICT ("unit_type_id", "related_unit_type_id", "relation_type_id") do NOTHING;
