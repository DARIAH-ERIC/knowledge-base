import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { alias, and, eq, sql } from "@/lib/db/sql";

/**
 * `organisationalUnitDocumentId` is the org's `entities.id`. Each related person is resolved to its
 * latest editable version for display. Person↔org relations are document-level, so there is a
 * single set per org document (no draft/published relation diff).
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getPersonRelations(organisationalUnitDocumentId: string) {
	const personDocumentLifecycle = alias(schema.documentLifecycle, "person_document_lifecycle");
	const organisationalUnitDocumentLifecycle = alias(
		schema.documentLifecycle,
		"organisational_unit_document_lifecycle",
	);

	return db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personDocumentId: schema.personsToOrganisationalUnits.personDocumentId,
			personName: schema.persons.name,
			personSortName: schema.persons.sortName,
			personSlug: schema.entities.slug,
			roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
			roleType: schema.personRoleTypes.type,
			duration: schema.personsToOrganisationalUnits.duration,
			targetUnitType: schema.organisationalUnitTypes.type,
			description: schema.personsToOrganisationalUnits.description,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(
			personDocumentLifecycle,
			eq(personDocumentLifecycle.documentId, schema.personsToOrganisationalUnits.personDocumentId),
		)
		.innerJoin(
			schema.persons,
			sql`${schema.persons.id} = COALESCE(${personDocumentLifecycle.draftId}, ${personDocumentLifecycle.publishedId})`,
		)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
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
			sql`${schema.organisationalUnits.id} = COALESCE(${organisationalUnitDocumentLifecycle.draftId}, ${organisationalUnitDocumentLifecycle.publishedId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			eq(
				schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
				organisationalUnitDocumentId,
			),
		)
		.orderBy(
			sql`UPPER(${schema.personsToOrganisationalUnits.duration}) DESC NULLS FIRST`,
			sql`LOWER(${schema.personsToOrganisationalUnits.duration}) DESC`,
		);
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

	const byRoleTypeId = new Map(rows.map((row) => [row.roleTypeId, row] as const));

	return [...byRoleTypeId.values()];
}

export type PersonRelationRoleOption = Awaited<
	ReturnType<typeof getPersonRelationRoleOptions>
>[number];

/**
 * The current relations of one person, with the organisational unit's name, for showing someone
 * their own roles. `personDocumentId` is the person's `entities.id`.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getCurrentRelationsOfPerson(personDocumentId: string) {
	return db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			roleType: schema.personRoleTypes.type,
			unitName: schema.organisationalUnits.name,
			unitType: schema.organisationalUnitTypes.type,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.innerJoin(
			schema.documentLifecycle,
			eq(
				schema.documentLifecycle.documentId,
				schema.personsToOrganisationalUnits.organisationalUnitDocumentId,
			),
		)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			and(
				eq(schema.personsToOrganisationalUnits.personDocumentId, personDocumentId),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		)
		.orderBy(schema.organisationalUnits.name);
}
