/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { and, eq } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";

export async function getWorkingGroupChairs(unitId: string) {
	return db
		.select({
			id: schema.personsToOrganisationalUnits.id,
			personId: schema.personsToOrganisationalUnits.personId,
			personName: schema.persons.name,
			duration: schema.personsToOrganisationalUnits.duration,
		})
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(schema.persons, eq(schema.persons.id, schema.personsToOrganisationalUnits.personId))
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.where(
			and(
				eq(schema.personsToOrganisationalUnits.organisationalUnitId, unitId),
				eq(schema.personRoleTypes.type, "is_chair_of"),
			),
		);
}

export type WorkingGroupChair = Awaited<ReturnType<typeof getWorkingGroupChairs>>[number];
