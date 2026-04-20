import { assert } from "@acdh-oeaw/lib";
import { inArray } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { createTestClient } from "~/test/lib/create-test-client";
import { seedContentBlock } from "~/test/lib/seed-content-block";
import { withTransaction } from "~/test/lib/with-transaction";

function createItems(count: number) {
	const items = f.helpers.multiple(
		() => {
			const id = uuidv7();
			const documentId = uuidv7();
			const name = f.lorem.sentence();
			const slug = slugify(name);

			const entity = {
				id,
				slug,
				documentId,
			};

			const organisationalUnit = {
				id,
				name,
				summary: f.lorem.paragraph(),
			};

			return { entity, organisationalUnit };
		},
		{ count },
	);

	return items;
}

function createPersonItems(count: number) {
	return f.helpers.multiple(
		() => {
			const id = uuidv7();
			const documentId = uuidv7();
			const assetId = uuidv7();
			const name = f.person.fullName();
			const slug = slugify(name);

			return {
				entity: {
					id,
					slug,
					documentId,
				},
				asset: {
					id: assetId,
					key: `persons/${assetId}.jpg`,
					label: name,
					mimeType: "image/jpeg",
				},
				person: {
					id,
					name,
					position: f.person.jobTitle(),
					sortName: f.person.lastName(),
					email: f.internet.email(),
					orcid: `0000-000${String(f.number.int({ min: 1, max: 9 }))}-${String(f.number.int({ min: 1000, max: 9999 }))}-${String(f.number.int({ min: 1000, max: 9999 }))}`,
					imageId: assetId,
				},
			};
		},
		{ count },
	);
}

async function seedCooperatingPartner(
	db: Database,
	ericUnitId: string,
	items: ReturnType<typeof createItems>,
) {
	const [institutionType, countryType, locatedInStatus, cooperatingPartnerStatus] =
		await Promise.all([
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "institution" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "country" },
			}),
			db.query.organisationalUnitStatus.findFirst({
				columns: { id: true },
				where: { status: "is_located_in" },
			}),
			db.query.organisationalUnitStatus.findFirst({
				columns: { id: true },
				where: { status: "is_cooperating_partner_of" },
			}),
		]);

	assert(institutionType, "No institution type in database.");
	assert(countryType, "No country type in database.");
	assert(locatedInStatus, "No is_located_in status in database.");
	assert(cooperatingPartnerStatus, "No is_cooperating_partner_of status in database.");

	const [country, institution] = items;
	assert(country);
	assert(institution);

	const start = f.date.past({ years: 5 });

	await db.insert(schema.organisationalUnits).values([
		{ ...country.organisationalUnit, typeId: countryType.id },
		{ ...institution.organisationalUnit, typeId: institutionType.id },
	]);

	await db.insert(schema.organisationalUnitsRelations).values([
		{
			unitId: institution.organisationalUnit.id,
			relatedUnitId: country.organisationalUnit.id,
			status: locatedInStatus.id,
			duration: { start },
		},
		{
			unitId: institution.organisationalUnit.id,
			relatedUnitId: ericUnitId,
			status: cooperatingPartnerStatus.id,
			duration: { start },
		},
	]);
}

async function seedPartnerInstitutions(
	db: Database,
	ericUnitId: string,
	countryId: string,
	items: ReturnType<typeof createItems>,
) {
	const [status, entityType, institutionType, locatedInStatus, partnerInstitutionStatus] =
		await Promise.all([
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
			db.query.entityTypes.findFirst({
				columns: { id: true },
				where: { type: "organisational_units" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "institution" },
			}),
			db.query.organisationalUnitStatus.findFirst({
				columns: { id: true },
				where: { status: "is_located_in" },
			}),
			db.query.organisationalUnitStatus.findFirst({
				columns: { id: true },
				where: { status: "is_partner_institution_of" },
			}),
		]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(institutionType, "No institution type in database.");
	assert(locatedInStatus, "No is_located_in status in database.");
	assert(partnerInstitutionStatus, "No is_partner_institution_of status in database.");

	const [institution] = items;
	assert(institution);

	const start = f.date.past({ years: 5 });

	await db.insert(schema.entities).values({
		...institution.entity,
		statusId: status.id,
		typeId: entityType.id,
	});

	await db.insert(schema.organisationalUnits).values({
		...institution.organisationalUnit,
		typeId: institutionType.id,
	});

	await db.insert(schema.organisationalUnitsRelations).values([
		{
			unitId: institution.organisationalUnit.id,
			relatedUnitId: countryId,
			status: locatedInStatus.id,
			duration: { start },
		},
		{
			unitId: institution.organisationalUnit.id,
			relatedUnitId: ericUnitId,
			status: partnerInstitutionStatus.id,
			duration: { start },
		},
	]);
}

async function seedContributor(
	db: Database,
	countryId: string,
	items: ReturnType<typeof createPersonItems>,
) {
	const [status, entityType, personRoleType] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "persons" },
		}),
		db.query.personRoleTypes.findFirst({
			columns: { id: true },
			where: { type: "national_coordinator" },
		}),
	]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(personRoleType, "No person role type in database.");

	const [person] = items;
	assert(person);

	const start = f.date.past({ years: 5 });

	await db.insert(schema.assets).values(person.asset);
	await db.insert(schema.entities).values({
		...person.entity,
		statusId: status.id,
		typeId: entityType.id,
	});
	await db.insert(schema.persons).values(person.person);
	await db.insert(schema.personsToOrganisationalUnits).values({
		personId: person.person.id,
		organisationalUnitId: countryId,
		roleTypeId: personRoleType.id,
		duration: { start },
	});

	return person;
}

async function seedNationalConsortium(
	db: Database,
	countryId: string,
	items: ReturnType<typeof createItems>,
) {
	const [status, entityType, consortiumType, nationalConsortiumStatus, asset] = await Promise.all([
		db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
		db.query.entityTypes.findFirst({
			columns: { id: true },
			where: { type: "organisational_units" },
		}),
		db.query.organisationalUnitTypes.findFirst({
			columns: { id: true },
			where: { type: "national_consortium" },
		}),
		db.query.organisationalUnitStatus.findFirst({
			columns: { id: true },
			where: { status: "is_national_consortium_of" },
		}),
		db.query.assets.findFirst({ columns: { id: true } }),
	]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(consortiumType, "No national consortium type in database.");
	assert(nationalConsortiumStatus, "No is_national_consortium_of status in database.");
	assert(asset, "No asset in database.");

	const [consortium] = items;
	assert(consortium);

	const start = f.date.past({ years: 5 });

	await db.insert(schema.entities).values({
		...consortium.entity,
		statusId: status.id,
		typeId: entityType.id,
	});

	await db.insert(schema.organisationalUnits).values({
		...consortium.organisationalUnit,
		typeId: consortiumType.id,
		imageId: asset.id,
	});

	await db.insert(schema.organisationalUnitsRelations).values({
		unitId: consortium.organisationalUnit.id,
		relatedUnitId: countryId,
		status: nationalConsortiumStatus.id,
		duration: { start },
	});

	return consortium;
}

async function seed(db: Database, items: ReturnType<typeof createItems>) {
	const [status, entityType, asset, countryType, umbrellaConsortiumType, memberObserverStatus] =
		await Promise.all([
			db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
			db.query.entityTypes.findFirst({
				columns: { id: true },
				where: { type: "organisational_units" },
			}),
			db.query.assets.findFirst({ columns: { id: true } }),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "country" },
			}),
			db.query.organisationalUnitTypes.findFirst({
				columns: { id: true },
				where: { type: "eric" },
			}),
			db
				.select()
				.from(schema.organisationalUnitStatus)
				.where(inArray(schema.organisationalUnitStatus.status, ["is_member_of", "is_observer_of"])),
		]);

	assert(status, "No entity status in database.");
	assert(entityType, "No entity type in database.");
	assert(asset, "No assets in database.");
	assert(countryType, "No country type in database.");
	assert(umbrellaConsortiumType, "No umbrella consortium type in database.");
	assert(memberObserverStatus.length, "No member or observer status in database.");

	await db.insert(schema.entities).values(
		items.map((item) => {
			return { ...item.entity, statusId: status.id, typeId: entityType.id };
		}),
	);

	await db.insert(schema.organisationalUnits).values({
		...items[0]!.organisationalUnit,
		typeId: umbrellaConsortiumType.id,
		imageId: asset.id,
	});

	await db.insert(schema.organisationalUnits).values(
		items.slice(1).map((item) => {
			return { ...item.organisationalUnit, typeId: countryType.id, imageId: asset.id };
		}),
	);

	const start = f.date.past({ years: 5 });

	await db.insert(schema.organisationalUnitsRelations).values(
		items.slice(1).map((item) => {
			return {
				unitId: item.organisationalUnit.id,
				relatedUnitId: items[0]!.organisationalUnit.id,
				status: f.helpers.arrayElement(memberObserverStatus).id,
				duration: {
					start,
				},
			};
		}),
	);

	await Promise.all(
		items.map((item) => {
			return seedContentBlock(db, item.entity.id, entityType.id, "description");
		}),
	);
}

describe("members-partners", () => {
	describe("GET /api/members-partners", () => {
		it("should return country with cooperating partner institution", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const [status, entityType, ericType] = await Promise.all([
					db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
					db.query.entityTypes.findFirst({
						columns: { id: true },
						where: { type: "organisational_units" },
					}),
					db.query.organisationalUnitTypes.findFirst({
						columns: { id: true },
						where: { type: "eric" },
					}),
				]);

				assert(status);
				assert(entityType);
				assert(ericType);

				// eric unit (not exposed, used as relation target)
				const ericItems = createItems(1);
				const [ericItem] = ericItems;
				assert(ericItem);

				await db.insert(schema.entities).values(
					ericItems.map((item) => {
						return {
							...item.entity,
							statusId: status.id,
							typeId: entityType.id,
						};
					}),
				);
				await db
					.insert(schema.organisationalUnits)
					.values({ ...ericItem.organisationalUnit, typeId: ericType.id });

				// country + institution as cooperating partner
				const partnerItems = createItems(2);
				await db.insert(schema.entities).values(
					partnerItems.map((item) => {
						return {
							...item.entity,
							statusId: status.id,
							typeId: entityType.id,
						};
					}),
				);
				await seedCooperatingPartner(db, ericItem.organisationalUnit.id, partnerItems);

				const country = partnerItems[0]!;

				const response = await client["members-partners"].$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = (await response.json()) as {
					data: Array<{
						name: string;
						status: string;
					}>;
					limit: number;
					offset: number;
					total: number;
				};

				expect(data.data).toEqual(
					expect.arrayContaining([
						expect.objectContaining({
							name: country.organisationalUnit.name,
							status: "is_cooperating_partner_of",
						}),
					]),
				);
			});
		});

		it("should return paginated list of members and partners", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const name = item.organisationalUnit.name;

				const response = await client["members-partners"].$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = (await response.json()) as {
					data: Array<{
						name: string;
						status: string;
					}>;
					limit: number;
					offset: number;
					total: number;
				};

				expect(data.total).toBeGreaterThanOrEqual(items.length - 1);
				expect(data.data).toEqual(expect.arrayContaining([expect.objectContaining({ name })]));
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/members-partners/:id", () => {
		it("should return single member or partner", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const id = item.entity.id;
				const name = item.organisationalUnit.name;
				const countryId = item.organisationalUnit.id;

				const [status, entityType, ericType] = await Promise.all([
					db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
					db.query.entityTypes.findFirst({
						columns: { id: true },
						where: { type: "organisational_units" },
					}),
					db.query.organisationalUnitTypes.findFirst({
						columns: { id: true },
						where: { type: "eric" },
					}),
				]);

				assert(status);
				assert(entityType);
				assert(ericType);

				const ericItems = createItems(1);
				const [ericItem] = ericItems;
				assert(ericItem);

				await db.insert(schema.entities).values(
					ericItems.map((entry) => {
						return {
							...entry.entity,
							statusId: status.id,
							typeId: entityType.id,
						};
					}),
				);
				await db
					.insert(schema.organisationalUnits)
					.values({ ...ericItem.organisationalUnit, typeId: ericType.id });

				const partnerInstitutionItems = createItems(1);
				await seedPartnerInstitutions(
					db,
					ericItem.organisationalUnit.id,
					countryId,
					partnerInstitutionItems,
				);
				const partnerInstitution = partnerInstitutionItems[0]!;
				const contributorItems = createPersonItems(1);
				const contributor = await seedContributor(db, countryId, contributorItems);
				const nationalConsortiumItems = createItems(1);
				const nationalConsortium = await seedNationalConsortium(
					db,
					countryId,
					nationalConsortiumItems,
				);

				const response = await client["members-partners"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(200);

				const data = (await response.json()) as unknown as {
					status: string;
					institutions: Array<{
						name: string;
						slug: string;
						website: string | null;
					}>;
					contributors: Array<{
						name: string;
						position: string | null;
						role: string;
					}>;
					nationalConsortium: { name: string; image: { url: string } | null } | null;
					description: Array<{ type: string }>;
					name: string;
				};

				assert("description" in data);
				expect(data).toMatchObject({ name });
				expect(data.institutions).toHaveLength(1);
				expect(data.institutions[0]).toMatchObject({
					name: partnerInstitution.organisationalUnit.name,
					slug: partnerInstitution.entity.slug,
					website: null,
				});
				expect(data.contributors).toHaveLength(1);
				expect(data.contributors[0]).toMatchObject({
					name: contributor.person.name,
					position: contributor.person.position,
					role: "national_coordinator",
				});
				expect(data.nationalConsortium).toMatchObject({
					name: nationalConsortium.organisationalUnit.name,
				});
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return cooperating partner institutions in institutions", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const [status, entityType, ericType] = await Promise.all([
					db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
					db.query.entityTypes.findFirst({
						columns: { id: true },
						where: { type: "organisational_units" },
					}),
					db.query.organisationalUnitTypes.findFirst({
						columns: { id: true },
						where: { type: "eric" },
					}),
				]);

				assert(status);
				assert(entityType);
				assert(ericType);

				const ericItems = createItems(1);
				const [ericItem] = ericItems;
				assert(ericItem);

				await db.insert(schema.entities).values(
					ericItems.map((entry) => {
						return {
							...entry.entity,
							statusId: status.id,
							typeId: entityType.id,
						};
					}),
				);
				await db
					.insert(schema.organisationalUnits)
					.values({ ...ericItem.organisationalUnit, typeId: ericType.id });

				const partnerItems = createItems(2);
				await db.insert(schema.entities).values(
					partnerItems.map((entry) => {
						return {
							...entry.entity,
							statusId: status.id,
							typeId: entityType.id,
						};
					}),
				);
				await seedCooperatingPartner(db, ericItem.organisationalUnit.id, partnerItems);

				const country = partnerItems[0]!;

				const response = await client["members-partners"][":id"].$get({
					param: {
						id: country.entity.id,
					},
				});

				expect(response.status).toBe(200);

				const data = (await response.json()) as unknown as {
					status: string;
					institutions: Array<{
						name: string;
						slug: string;
						website: string | null;
					}>;
				};

				expect(data.status).toBe("is_cooperating_partner_of");
				expect(data.institutions).toHaveLength(1);
				expect(data.institutions[0]).toMatchObject({
					name: partnerItems[1]!.organisationalUnit.name,
					slug: partnerItems[1]!.entity.slug,
					website: null,
				});
			});
		});

		it("should return 400 for invalid id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const id = "no-uuid";

				const response = await client["members-partners"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(400);
			});
		});

		it("should return 404 for non-existing id", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const id = "019b75fd-6d6a-757c-acc2-c3c6266a0f31";

				const response = await client["members-partners"][":id"].$get({
					param: {
						id,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});

	describe("GET /api/members-partners/slugs", () => {
		it("should return paginated list of slugs", async () => {
			await withTransaction(async (db) => {
				const limit = 10;
				const offset = 0;

				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;

				const response = await client["members-partners"].slugs.$get({
					query: {
						limit: String(limit),
						offset: String(offset),
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				expect(data.total).toBeGreaterThanOrEqual(items.length - 1);
				expect(data.data).toEqual(
					expect.arrayContaining([expect.objectContaining({ entity: { slug } })]),
				);
				expect(data.limit).toBe(limit);
				expect(data.offset).toBe(offset);
			});
		});
	});

	describe("GET /api/members-partners/slugs/:slug", () => {
		it("should return single member or partner", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const item = items.at(1)!;
				const slug = item.entity.slug;
				const name = item.organisationalUnit.name;
				const countryId = item.organisationalUnit.id;

				const [status, entityType, ericType] = await Promise.all([
					db.query.entityStatus.findFirst({ columns: { id: true }, where: { type: "published" } }),
					db.query.entityTypes.findFirst({
						columns: { id: true },
						where: { type: "organisational_units" },
					}),
					db.query.organisationalUnitTypes.findFirst({
						columns: { id: true },
						where: { type: "eric" },
					}),
				]);

				assert(status);
				assert(entityType);
				assert(ericType);

				const ericItems = createItems(1);
				const [ericItem] = ericItems;
				assert(ericItem);

				await db.insert(schema.entities).values(
					ericItems.map((entry) => {
						return {
							...entry.entity,
							statusId: status.id,
							typeId: entityType.id,
						};
					}),
				);
				await db
					.insert(schema.organisationalUnits)
					.values({ ...ericItem.organisationalUnit, typeId: ericType.id });

				const partnerInstitutionItems = createItems(1);
				await seedPartnerInstitutions(
					db,
					ericItem.organisationalUnit.id,
					countryId,
					partnerInstitutionItems,
				);
				const partnerInstitution = partnerInstitutionItems[0]!;
				const contributorItems = createPersonItems(1);
				const contributor = await seedContributor(db, countryId, contributorItems);
				const nationalConsortiumItems = createItems(1);
				const nationalConsortium = await seedNationalConsortium(
					db,
					countryId,
					nationalConsortiumItems,
				);

				const response = await client["members-partners"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(200);

				const data = await response.json();

				assert("description" in data);
				expect(data).toMatchObject({ name });
				expect(data.institutions).toHaveLength(1);
				expect(data.institutions[0]).toMatchObject({
					name: partnerInstitution.organisationalUnit.name,
					slug: partnerInstitution.entity.slug,
					website: null,
				});
				expect(data.contributors).toHaveLength(1);
				expect(data.contributors[0]).toMatchObject({
					name: contributor.person.name,
					position: contributor.person.position,
					role: "national_coordinator",
				});
				expect(data.nationalConsortium).toMatchObject({
					name: nationalConsortium.organisationalUnit.name,
				});
				expect(data.description).toHaveLength(1);
				expect(data.description[0]).toMatchObject({ type: "rich_text" });
			});
		});

		it("should return 404 for non-existing slug", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const items = createItems(5);
				await seed(db, items);

				const slug = "non-existing-slug";

				const response = await client["members-partners"].slugs[":slug"].$get({
					param: {
						slug,
					},
				});

				expect(response.status).toBe(404);
			});
		});
	});
});
