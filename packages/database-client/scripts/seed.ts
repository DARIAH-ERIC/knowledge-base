import { log } from "@acdh-oeaw/lib";

import { db } from "../src/lib/admin-client";
import { seed } from "../src/lib/seed";

async function main() {
	await seed(db);

	const organisationalUnitsAllowedRelationsValues = [
		{
			unitType: "consortium" as const,
			relatedUnitType: "consortium" as const,
			relationType: "member" as const,
		},
		{
			unitType: "consortium" as const,
			relatedUnitType: "consortium" as const,
			relationType: "cooperating_partner" as const,
		},
		{
			unitType: "institution" as const,
			relatedUnitType: "consortium" as const,
			relationType: "national_coordinating_institution" as const,
		},
		{
			unitType: "institution" as const,
			relatedUnitType: "consortium" as const,
			relationType: "national_representative_institution" as const,
		},
		{
			unitType: "institution" as const,
			relatedUnitType: "consortium" as const,
			relationType: "partner_institution" as const,
		},
	];

	await db
		.insert(schema.organisationalUnitsAllowedRelations)
		.values(organisationalUnitsAllowedRelationsValues);

	const organisationalUnits = f.helpers.multiple(
		(_, i) => {
			const name = f.lorem.sentence();

			return {
				name,
				summary: f.lorem.paragraph(),
				imageId: f.helpers.arrayElement(assetIds).id,
				slug: f.helpers.slugify(name),
				type: schema.organisationalUnitTypes[i % schema.organisationalUnitTypes.length]!,
			};
		},
		{ count: 25 },
	);

	const allowedUnitTypesForRelations = new Set<string>(
		organisationalUnitsAllowedRelationsValues.flatMap(({ unitType, relatedUnitType }) => {
			return [unitType, relatedUnitType];
		}),
	);

	const organisationalUnitsResult = await db
		.insert(schema.organisationalUnits)
		.values(organisationalUnits)
		.returning({ id: schema.organisationalUnits.id, type: schema.organisationalUnits.type });

	const unitsToUnits = organisationalUnitsResult
		.filter((organisationalUnit) => {
			return allowedUnitTypesForRelations.has(organisationalUnit.type);
		})
		.flatMap(({ id: unitId, type: unitType }) => {
			return f.helpers
				.arrayElements(
					organisationalUnitsResult.filter((organisationalUnit) => {
						return allowedUnitTypesForRelations.has(organisationalUnit.type);
					}),
					{ min: 3, max: 7 },
				)
				.filter((unit) => {
					return organisationalUnitsAllowedRelationsValues.some(
						(organisationalUnitsAllowedRelationsValue) => {
							return (
								organisationalUnitsAllowedRelationsValue.unitType === unit.type &&
								organisationalUnitsAllowedRelationsValue.relatedUnitType === unit.type
							);
						},
					);
				})
				.map(({ id: relatedUnitId, type: relatedUnitType }) => {
					const startDate = f.date.past({ years: 5 });
					return {
						unitId,
						relatedUnitId,
						startDate,
						endDate: f.helpers.maybe(
							() => {
								return f.date.between({ from: startDate, to: Date.now() });
							},
							{ probability: 0.25 },
						),
						status: f.helpers.arrayElement(
							organisationalUnitsAllowedRelationsValues.filter((allowedRelationsValue) => {
								return (
									(allowedRelationsValue.unitType === unitType ||
										allowedRelationsValue.unitType === relatedUnitType) &&
									(allowedRelationsValue.relatedUnitType === unitType ||
										allowedRelationsValue.relatedUnitType === relatedUnitType)
								);
							}),
						).relationType,
					};
				});
		});

	await db.insert(schema.organisationalUnitsRelations).values(unitsToUnits);

	log.success("Successfully seeded database.");
}

main()
	.catch((error: unknown) => {
		log.error("Failed to seed database.\n", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
