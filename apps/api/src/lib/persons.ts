// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { and, eq, inArray, sql } from "@dariah-eric/database";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";

interface PersonPositionRow {
	personId: string;
	roleType: (typeof schema.personRoleTypesEnum)[number];
	unitName: string;
}

export async function getPersonPositions(
	db: Database | Transaction,
	personIds: Array<string>,
): Promise<Map<string, string | null>> {
	const positions = new Map<string, string | null>();

	for (const personId of personIds) {
		positions.set(personId, null);
	}

	if (personIds.length === 0) {
		return positions;
	}

	const rows = await db
		.select({
			personId: schema.personsToOrganisationalUnits.personId,
			roleType: schema.personRoleTypes.type,
			unitName: schema.organisationalUnits.name,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.personsToOrganisationalUnits.organisationalUnitId, schema.organisationalUnits.id),
		)
		.where(
			and(
				inArray(schema.personsToOrganisationalUnits.personId, personIds),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const rowsByPerson = new Map<string, Array<PersonPositionRow>>();

	for (const row of rows) {
		const items = rowsByPerson.get(row.personId) ?? [];
		items.push(row);
		rowsByPerson.set(row.personId, items);
	}

	for (const personId of personIds) {
		const personRows = rowsByPerson.get(personId) ?? [];
		const unitNames = Array.from(
			new Set(
				personRows
					.map((row) => {
						return row.unitName;
					})
					// eslint-disable-next-line unicorn/no-array-sort
					.sort((a, b) => {
						return a.localeCompare(b);
					}),
			),
		);

		positions.set(personId, unitNames.length > 0 ? unitNames.join(", ") : null);
	}

	return positions;
}
