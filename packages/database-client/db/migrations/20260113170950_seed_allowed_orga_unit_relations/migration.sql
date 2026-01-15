INSERT INTO
	"organisational_units_allowed_relations" ("type", "related_unit_type", "relation_type")
VALUES
	(
		'consortium',
		'umbrella_consortium',
		'member'
	),
	(
		'consortium',
		'umbrella_consortium',
		'cooperating_partner'
	),
	(
		'institution',
		'consortium',
		'national_coordinating_institution'
	),
	(
		'institution',
		'consortium',
		'national_representative_institution'
	),
	(
		'institution',
		'consortium',
		'partner_institution'
	)
ON CONFLICT ("type", "related_unit_type", "relation_type") DO NOTHING;
