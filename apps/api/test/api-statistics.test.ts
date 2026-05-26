import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { getStatistics } from "@/routes/statistics/service";
import { withTransaction } from "~/test/lib/with-transaction";

function createOrganisationalUnit(statusId: string, entityTypeId: string) {
	const entityId = uuidv7();
	const versionId = uuidv7();
	const name = f.company.name();

	return {
		entity: {
			id: entityId,
			slug: `${slugify(name)}-${f.string.alphanumeric(8).toLowerCase()}`,
			typeId: entityTypeId,
		},
		version: {
			id: versionId,
			entityId,
			statusId,
		},
		unit: {
			id: versionId,
			name,
		},
	};
}

async function seedMemberCountryCountFixtures(db: Database) {
	const [publishedStatus, draftStatus, entityType, countryType, ericType, memberStatus] =
		await Promise.all([
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "draft" } }),
			db.query.entityTypes.findFirst({
				columns: { id: true },
				where: { type: "organisational_units" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "country" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "eric" },
			}),
			db.query.organisationalUnitStatus.findFirst({
				columns: { id: true },
				where: { status: "is_member_of" },
			}),
		]);

	assert(publishedStatus, "No published entity status in database.");
	assert(draftStatus, "No draft entity status in database.");
	assert(entityType, "No organisational_units entity type in database.");
	assert(countryType, "No country type in database.");
	assert(ericType, "No eric type in database.");
	assert(memberStatus, "No is_member_of status in database.");

	const eric = await db.query.organisationalUnits.findFirst({
		columns: { id: true },
		where: {
			type: {
				type: "eric",
			},
		},
	});

	assert(eric, "No eric organisational unit in database.");

	const publishedCountry = createOrganisationalUnit(publishedStatus.id, entityType.id);
	const draftCountry = createOrganisationalUnit(draftStatus.id, entityType.id);
	const start = f.date.past({ years: 5 });

	await db.insert(schema.entities).values([publishedCountry.entity, draftCountry.entity]);
	await db.insert(schema.entityVersions).values([publishedCountry.version, draftCountry.version]);
	await db.insert(schema.organisationalUnits).values([
		{ ...publishedCountry.unit, typeId: countryType.id },
		{ ...draftCountry.unit, typeId: countryType.id },
	]);

	await db.insert(schema.organisationalUnitsRelations).values([
		{
			unitId: publishedCountry.unit.id,
			relatedUnitId: eric.id,
			status: memberStatus.id,
			duration: { start },
		},
		{
			unitId: publishedCountry.unit.id,
			relatedUnitId: eric.id,
			status: memberStatus.id,
			duration: { start },
		},
		{
			unitId: draftCountry.unit.id,
			relatedUnitId: eric.id,
			status: memberStatus.id,
			duration: { start },
		},
	]);
}

async function seedWorkingGroupCountFixtures(db: Database) {
	const [publishedStatus, draftStatus, entityType, workingGroupType, memberStatus] =
		await Promise.all([
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "draft" } }),
			db.query.entityTypes.findFirst({
				columns: { id: true },
				where: { type: "organisational_units" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "working_group" },
			}),
			db.query.organisationalUnitStatus.findFirst({
				columns: { id: true },
				where: { status: "is_part_of" },
			}),
		]);

	assert(publishedStatus, "No published entity status in database.");
	assert(draftStatus, "No draft entity status in database.");
	assert(entityType, "No organisational_units entity type in database.");
	assert(workingGroupType, "No working_group type in database.");
	assert(memberStatus, "No is_part_of status in database.");

	const eric = await db.query.organisationalUnits.findFirst({
		columns: { id: true },
		where: {
			type: {
				type: "eric",
			},
		},
	});

	assert(eric, "No eric organisational unit in database.");

	const publishedWorkingGroup = createOrganisationalUnit(publishedStatus.id, entityType.id);
	const draftWorkingGroup = createOrganisationalUnit(draftStatus.id, entityType.id);
	const start = f.date.past({ years: 5 });

	await db.insert(schema.entities).values([publishedWorkingGroup.entity, draftWorkingGroup.entity]);
	await db
		.insert(schema.entityVersions)
		.values([publishedWorkingGroup.version, draftWorkingGroup.version]);
	await db.insert(schema.organisationalUnits).values([
		{ ...publishedWorkingGroup.unit, typeId: workingGroupType.id },
		{ ...draftWorkingGroup.unit, typeId: workingGroupType.id },
	]);

	await db.insert(schema.organisationalUnitsRelations).values([
		{
			unitId: publishedWorkingGroup.unit.id,
			relatedUnitId: eric.id,
			status: memberStatus.id,
			duration: { start },
		},
		{
			unitId: publishedWorkingGroup.unit.id,
			relatedUnitId: eric.id,
			status: memberStatus.id,
			duration: { start },
		},
		{
			unitId: draftWorkingGroup.unit.id,
			relatedUnitId: eric.id,
			status: memberStatus.id,
			duration: { start },
		},
	]);
}

describe("statistics", () => {
	it("counts distinct published member countries", async () => {
		await withTransaction(async (db) => {
			const before = await getStatistics(db);
			assert(before.memberCountries != null, "Expected memberCountries statistic.");

			await seedMemberCountryCountFixtures(db);

			const after = await getStatistics(db);
			assert(after.memberCountries != null, "Expected memberCountries statistic.");

			expect(after.memberCountries).toBe(before.memberCountries + 1);
		});
	});

	it("counts distinct published active working groups", async () => {
		await withTransaction(async (db) => {
			const before = await getStatistics(db);
			assert(before.workingGroups != null, "Expected workingGroups statistic.");

			await seedWorkingGroupCountFixtures(db);

			const after = await getStatistics(db);
			assert(after.workingGroups != null, "Expected workingGroups statistic.");

			expect(after.workingGroups).toBe(before.workingGroups + 1);
		});
	});
});
