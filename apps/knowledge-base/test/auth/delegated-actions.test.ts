import { randomBytes, randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { describe, expect, it, vi } from "vitest";

import type * as DbModule from "@/lib/db";
import type { Transaction } from "@/lib/db";
import { withTransaction } from "@/test/lib/with-transaction";

/**
 * The actions under test write through the shared `db`. Route it to the test's transaction (the
 * actions' own `db.transaction` calls nest as savepoints), so everything is rolled back with it.
 */
const { currentTx, currentUser } = vi.hoisted(() => {
	const currentTx: { value: Transaction | null } = { value: null };
	const currentUser: { value: User | null } = { value: null };
	return { currentTx, currentUser };
});

vi.mock("@/lib/db", async (importOriginal) => {
	const actual = await importOriginal<typeof DbModule>();
	const db = new Proxy(actual.db, {
		get(target, property) {
			const executor = currentTx.value ?? target;
			const value: unknown = Reflect.get(executor, property);
			return typeof value === "function"
				? (value as (...args: Array<unknown>) => unknown).bind(executor)
				: value;
		},
	});
	return { ...actual, db };
});

vi.mock("@/lib/auth/session", () => {
	const session = () =>
		Promise.resolve({
			user: currentUser.value,
			realUser: currentUser.value,
			isImpersonating: false,
		});
	return { assertAuthenticated: session, assertAdmin: session };
});

vi.mock("next/server", () => {
	return { after: vi.fn() };
});

vi.mock("next/cache", () => {
	return { revalidatePath: vi.fn() };
});

vi.mock("next-intl/server", () => {
	return {
		getLocale: vi.fn().mockResolvedValue("en"),
		getExtracted: vi.fn().mockResolvedValue((key: string) => key),
	};
});

vi.mock("@dariah-eric/next-lib/rate-limiter", () => {
	return { globalPostRequestRateLimit: vi.fn().mockResolvedValue(true) };
});

vi.mock("@/lib/navigation/navigation", () => {
	return {
		redirect: () => {
			throw new Error("REDIRECT");
		},
	};
});

vi.mock("@/lib/webhook/dispatch-webhook", () => {
	return { dispatchWebhook: vi.fn().mockResolvedValue(undefined) };
});

const { createContributionAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/create-contribution.action");
const { updateContributionAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/update-contribution.action");
const { updateDelegatedPersonAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/_lib/update-delegated-person.action");
const { updateDelegatedInstitutionAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/countries/[code]/edit/_lib/update-delegated-institution.action");
const { createDraftDocument, getDocumentVersions, publishVersion } =
	await import("@/lib/data/entity-lifecycle");
const { organisationalUnitsLifecycleAdapter } =
	await import("@/lib/data/organisational-units.lifecycle-adapter");
const { personsLifecycleAdapter } = await import("@/lib/data/persons.lifecycle-adapter");

type Tx = Transaction;

const ACTIVE_DURATION = { start: new Date("2020-01-01T00:00:00.000Z") } as const;

/** Runs `fn` in a rolled-back transaction that the actions write through as well. */
async function withActionTransaction(fn: (tx: Tx) => Promise<void>): Promise<void> {
	await withTransaction(async (tx) => {
		currentTx.value = tx;
		try {
			await fn(tx);
		} finally {
			currentTx.value = null;
			currentUser.value = null;
		}
	});
}

/** Creates a user row (audit events reference it) and signs it in for the actions. */
async function signIn(
	tx: Tx,
	role: "admin" | "user",
	personDocumentId: string | null = null,
): Promise<void> {
	const [row] = await tx
		.insert(schema.users)
		.values({
			email: `${randomUUID()}@example.com`,
			name: `test-${role}`,
			passwordHash: "not-a-real-hash",
			twoFactorRecoveryCode: randomBytes(16),
			role,
			isEmailVerified: true,
		})
		.returning({ id: schema.users.id });
	assert(row);
	currentUser.value = {
		id: row.id,
		role,
		personDocumentId,
		organisationalUnitDocumentId: null,
	} as unknown as User;
}

async function entityTypeId(tx: Tx, type: "organisational_units" | "persons"): Promise<string> {
	const row = await tx.query.entityTypes.findFirst({ where: { type }, columns: { id: true } });
	assert(row, `entity type "${type}" not seeded`);
	return row.id;
}

async function seedUnit(tx: Tx, type: "country" | "institution"): Promise<string> {
	const unitType = await tx.query.organisationalUnitTypes.findFirst({
		where: { type },
		columns: { id: true },
	});
	assert(unitType, `organisational unit type "${type}" not seeded`);
	const { documentId, versionId } = await createDraftDocument(
		tx,
		await entityTypeId(tx, "organisational_units"),
		`test-${type}-${randomUUID()}`,
	);
	await tx.insert(schema.organisationalUnits).values({
		id: versionId,
		name: `Test ${type} ${documentId.slice(0, 8)}`,
		typeId: unitType.id,
	});
	return documentId;
}

async function seedPerson(tx: Tx, name = `Test Person ${randomUUID()}`): Promise<string> {
	const { documentId, versionId } = await createDraftDocument(
		tx,
		await entityTypeId(tx, "persons"),
		`test-person-${randomUUID()}`,
	);
	await tx.insert(schema.persons).values({ id: versionId, name, sortName: name });
	return documentId;
}

async function roleTypeId(
	tx: Tx,
	type: (typeof schema.personRoleTypesEnum)[number],
): Promise<string> {
	const row = await tx.query.personRoleTypes.findFirst({ where: { type }, columns: { id: true } });
	assert(row, `person role type "${type}" not seeded`);
	return row.id;
}

async function relate(
	tx: Tx,
	personDocumentId: string,
	organisationalUnitDocumentId: string,
	role: (typeof schema.personRoleTypesEnum)[number],
	description: string | null = null,
): Promise<string> {
	const [row] = await tx
		.insert(schema.personsToOrganisationalUnits)
		.values({
			personDocumentId,
			organisationalUnitDocumentId,
			roleTypeId: await roleTypeId(tx, role),
			duration: ACTIVE_DURATION,
			description,
		})
		.returning({ id: schema.personsToOrganisationalUnits.id });
	assert(row);
	return row.id;
}

async function locateIn(tx: Tx, unitDocumentId: string, countryDocumentId: string): Promise<void> {
	const status = await tx.query.organisationalUnitStatus.findFirst({
		where: { status: "is_located_in" },
		columns: { id: true },
	});
	assert(status);
	await tx.insert(schema.organisationalUnitsRelations).values({
		unitDocumentId,
		relatedUnitDocumentId: countryDocumentId,
		status: status.id,
		duration: ACTIVE_DURATION,
	});
}

/** A country with a signed-in national coordinator. */
async function seedCoordinatedCountry(tx: Tx): Promise<{ country: string }> {
	const country = await seedUnit(tx, "country");
	const coordinator = await seedPerson(tx);
	await relate(tx, coordinator, country, "national_coordinator");
	await signIn(tx, "user", coordinator);
	return { country };
}

function toFormData(values: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) {
		formData.set(key, value);
	}
	return formData;
}

async function getDescription(tx: Tx, relationId: string): Promise<string | null | undefined> {
	const row = await tx.query.personsToOrganisationalUnits.findFirst({
		where: { id: relationId },
		columns: { description: true },
	});
	return row?.description;
}

describe("person relation description (admin-only)", () => {
	it("a delegated create stores no description", async () => {
		await withActionTransaction(async (tx) => {
			const { country } = await seedCoordinatedCountry(tx);
			const person = await seedPerson(tx);

			const state = await createContributionAction(
				createActionStateInitial(),
				toFormData({
					personDocumentId: person,
					roleTypeId: await roleTypeId(tx, "national_representative"),
					organisationalUnitDocumentId: country,
					"duration.start": "2020-01-01",
					description: "Should not be stored",
				}),
			);
			assert(state.status === "success", JSON.stringify(state));

			const { id } = state.data as { id: string };
			expect(await getDescription(tx, id)).toBeNull();
		});
	});

	it("a delegated update cannot change the description an admin wrote", async () => {
		await withActionTransaction(async (tx) => {
			const { country } = await seedCoordinatedCountry(tx);
			const person = await seedPerson(tx);
			const relation = await relate(tx, person, country, "national_representative", "By an admin");

			const state = await updateContributionAction(
				createActionStateInitial(),
				toFormData({
					id: relation,
					personDocumentId: person,
					roleTypeId: await roleTypeId(tx, "national_representative"),
					organisationalUnitDocumentId: country,
					"duration.start": "2021-01-01",
					description: "Changed by the coordinator",
				}),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");

			expect(await getDescription(tx, relation)).toBe("By an admin");
		});
	});

	it("an admin can set and change the description", async () => {
		await withActionTransaction(async (tx) => {
			const country = await seedUnit(tx, "country");
			const person = await seedPerson(tx);
			await signIn(tx, "admin");
			const roleType = await roleTypeId(tx, "national_representative");

			const created = await createContributionAction(
				createActionStateInitial(),
				toFormData({
					personDocumentId: person,
					roleTypeId: roleType,
					organisationalUnitDocumentId: country,
					"duration.start": "2020-01-01",
					description: "First",
				}),
			);
			assert(created.status === "success", JSON.stringify(created));
			const { id } = created.data as { id: string };
			expect(await getDescription(tx, id)).toBe("First");

			const updated = await updateContributionAction(
				createActionStateInitial(),
				toFormData({
					id,
					personDocumentId: person,
					roleTypeId: roleType,
					organisationalUnitDocumentId: country,
					"duration.start": "2020-01-01",
					description: "Second",
				}),
			);
			expect(updated.status, JSON.stringify(updated)).toBe("success");
			expect(await getDescription(tx, id)).toBe("Second");
		});
	});
});

describe("delegated entity edits are saved as drafts", () => {
	it("editing a published person leaves the published version untouched", async () => {
		await withActionTransaction(async (tx) => {
			const { country } = await seedCoordinatedCountry(tx);
			const person = await seedPerson(tx, "Published Name");
			await relate(tx, person, country, "national_representative");
			await publishVersion(tx, person, personsLifecycleAdapter);

			const state = await updateDelegatedPersonAction(
				createActionStateInitial(),
				toFormData({ documentId: person, name: "Edited Name", sortName: "Edited Name" }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");

			const { draftId, publishedId } = await getDocumentVersions(tx, person);
			assert(draftId != null && publishedId != null);
			const published = await tx.query.persons.findFirst({
				where: { id: publishedId },
				columns: { name: true },
			});
			const draft = await tx.query.persons.findFirst({
				where: { id: draftId },
				columns: { name: true },
			});
			expect(published?.name).toBe("Published Name");
			expect(draft?.name).toBe("Edited Name");
		});
	});

	it("editing a published institution leaves the published version untouched", async () => {
		await withActionTransaction(async (tx) => {
			const { country } = await seedCoordinatedCountry(tx);
			const institution = await seedUnit(tx, "institution");
			await locateIn(tx, institution, country);
			await publishVersion(tx, institution, organisationalUnitsLifecycleAdapter);
			const { publishedId: originalPublishedId } = await getDocumentVersions(tx, institution);
			assert(originalPublishedId != null);
			const original = await tx.query.organisationalUnits.findFirst({
				where: { id: originalPublishedId },
				columns: { name: true },
			});

			const state = await updateDelegatedInstitutionAction(
				createActionStateInitial(),
				toFormData({ documentId: institution, name: "Edited Institution" }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");

			const { draftId, publishedId } = await getDocumentVersions(tx, institution);
			assert(draftId != null);
			expect(publishedId).toBe(originalPublishedId);
			const published = await tx.query.organisationalUnits.findFirst({
				where: { id: originalPublishedId },
				columns: { name: true },
			});
			const draft = await tx.query.organisationalUnits.findFirst({
				where: { id: draftId },
				columns: { name: true },
			});
			expect(published?.name).toBe(original?.name);
			expect(draft?.name).toBe("Edited Institution");
		});
	});
});
