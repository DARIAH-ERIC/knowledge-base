// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { and, eq, inArray, sql } from "@dariah-eric/database";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";

export interface PersonPosition {
	role: (typeof schema.personRoleTypesEnum)[number];
	name: string;
}

export async function getPersonPositions(
	db: Database | Transaction,
	personIds: Array<string>,
): Promise<Map<string, Array<PersonPosition> | null>> {
	const positions = new Map<string, Array<PersonPosition> | null>();

	for (const personId of personIds) {
		positions.set(personId, null);
	}

	if (personIds.length === 0) {
		return positions;
	}

	const rows = await db
		.select({
			personId: schema.personsToOrganisationalUnits.personId,
			role: schema.personRoleTypes.type,
			name: schema.organisationalUnits.name,
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

	const rowsByPerson = new Map<string, Array<PersonPosition>>();

	for (const row of rows) {
		const items = rowsByPerson.get(row.personId) ?? [];
		items.push({ role: row.role, name: row.name });
		rowsByPerson.set(row.personId, items);
	}

	for (const personId of personIds) {
		const personRows = rowsByPerson.get(personId) ?? [];
		// eslint-disable-next-line unicorn/no-array-sort
		const sorted = personRows.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});

		positions.set(personId, sorted.length > 0 ? sorted : null);
	}

	return positions;
}
