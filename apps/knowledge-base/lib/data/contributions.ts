import { eq, inArray } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getPersonContributions(personId: string) {
	return db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			duration: schema.personsToOrganisationalUnits.duration,
			roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
			roleType: schema.personRoleTypes.type,
			organisationalUnitId: schema.personsToOrganisationalUnits.organisationalUnitId,
			organisationalUnitName: schema.organisationalUnits.name,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.personsToOrganisationalUnits.organisationalUnitId),
		)
		.where(eq(schema.personsToOrganisationalUnits.personId, personId));
}

export type PersonContribution = Awaited<ReturnType<typeof getPersonContributions>>[number];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getContributionOptions() {
	const allowedCombos = await db
		.select({
			roleTypeId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			roleType: schema.personRoleTypes.type,
			unitTypeId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
		})
		.from(schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations)
		.innerJoin(
			schema.personRoleTypes,
			eq(
				schema.personRoleTypes.id,
				schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			),
		);

	if (allowedCombos.length === 0) return [];

	const unitTypeIds = [
		...new Set(
			allowedCombos.map((c) => {
				return c.unitTypeId;
			}),
		),
	];

	const orgUnits = await db
		.select({
			id: schema.organisationalUnits.id,
			name: schema.organisationalUnits.name,
			typeId: schema.organisationalUnits.typeId,
		})
		.from(schema.organisationalUnits)
		.where(inArray(schema.organisationalUnits.typeId, unitTypeIds));

	const byRole = new Map<
		string,
		{ roleTypeId: string; roleType: string; availableUnits: Array<{ id: string; name: string }> }
	>();

	for (const combo of allowedCombos) {
		if (!byRole.has(combo.roleTypeId)) {
			byRole.set(combo.roleTypeId, {
				roleTypeId: combo.roleTypeId,
				roleType: combo.roleType,
				availableUnits: [],
			});
		}

		const entry = byRole.get(combo.roleTypeId)!;

		for (const unit of orgUnits) {
			if (
				unit.typeId === combo.unitTypeId &&
				!entry.availableUnits.some((u) => {
					return u.id === unit.id;
				})
			) {
				entry.availableUnits.push({ id: unit.id, name: unit.name });
			}
		}
	}

	return Array.from(byRole.values()).map((entry) => {
		return {
			...entry,
			availableUnits: entry.availableUnits.sort((a, b) => {
				return a.name.localeCompare(b.name);
			}),
		};
	});
}

export type ContributionOption = Awaited<ReturnType<typeof getContributionOptions>>[number];
