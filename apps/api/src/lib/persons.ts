import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";
import { alias, and, eq, inArray, sql } from "@/services/db/sql";

export interface PersonPosition {
	role: (typeof schema.personRoleTypesEnum)[number];
	name: string;
	type: (typeof schema.organisationalUnitTypesEnum)[number];
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

	// person↔org relations are document-level. `personIds` are published version ids; re-key the
	// relation join through each endpoint's document and resolve the org to its published version.
	const personEntityVersions = alias(schema.entityVersions, "person_entity_versions");
	const organisationalUnitDocumentLifecycle = alias(
		schema.documentLifecycle,
		"organisational_unit_document_lifecycle",
	);

	const rows = await db
		.select({
			personId: personEntityVersions.id,
			role: schema.personRoleTypes.type,
			name: schema.organisationalUnits.name,
			type: schema.organisationalUnitTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			personEntityVersions,
			eq(personEntityVersions.entityId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personsToOrganisationalUnits.roleTypeId, schema.personRoleTypes.id),
		)
		.innerJoin(
			organisationalUnitDocumentLifecycle,
			eq(
				organisationalUnitDocumentLifecycle.documentId,
				schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
			),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, organisationalUnitDocumentLifecycle.publishedId),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
		)
		.where(
			and(
				inArray(personEntityVersions.id, personIds),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const rowsByPerson = new Map<string, Array<PersonPosition>>();

	for (const row of rows) {
		const items = rowsByPerson.get(row.personId) ?? [];
		items.push({ role: row.role, name: row.name, type: row.type });
		rowsByPerson.set(row.personId, items);
	}

	for (const personId of personIds) {
		const personRows = rowsByPerson.get(personId) ?? [];
		// eslint-disable-next-line unicorn/no-array-sort
		const sorted = personRows.sort((a, b) => a.name.localeCompare(b.name));

		positions.set(personId, sorted.length > 0 ? sorted : null);
	}

	return positions;
}
