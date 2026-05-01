import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getPersonRelations(organisationalUnitId: string) {
	return db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personId: schema.personsToOrganisationalUnits.personId,
			personName: schema.persons.name,
			roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
			roleType: schema.personRoleTypes.type,
			duration: schema.personsToOrganisationalUnits.duration,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(schema.persons, eq(schema.persons.id, schema.personsToOrganisationalUnits.personId))
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.where(eq(schema.personsToOrganisationalUnits.organisationalUnitId, organisationalUnitId));
}

export type PersonRelation = Awaited<ReturnType<typeof getPersonRelations>>[number];

export async function getPersonRelationRoleOptions(
	unitType: string,
): Promise<Array<{ roleTypeId: string; roleType: string }>> {
	const rows = await db
		.select({
			roleTypeId: schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			roleType: schema.personRoleTypes.type,
		})
		.from(schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations)
		.innerJoin(
			schema.organisationalUnitTypes,
			and(
				eq(
					schema.organisationalUnitTypes.id,
					schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.unitTypeId,
				),
				eq(
					schema.organisationalUnitTypes.type,
					unitType as typeof schema.organisationalUnitTypes.$inferSelect.type,
				),
			),
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(
				schema.personRoleTypes.id,
				schema.personRoleTypesToOrganisationalUnitTypesAllowedRelations.roleTypeId,
			),
		)
		.orderBy(schema.personRoleTypes.type);

	const byRoleTypeId = new Map(
		rows.map((row) => {
			return [row.roleTypeId, row] as const;
		}),
	);

	return [...byRoleTypeId.values()];
}

export type PersonRelationRoleOption = Awaited<
	ReturnType<typeof getPersonRelationRoleOptions>
>[number];
