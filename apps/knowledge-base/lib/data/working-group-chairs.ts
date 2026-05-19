/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

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

export type RelationLifecycleStatus = "changed" | "new";

function durationKey(duration: WorkingGroupChair["duration"]): string {
	return [duration.start.toISOString(), duration.end?.toISOString() ?? ""].join(":");
}

export function annotateWorkingGroupChairLifecycle(
	draftChairs: Array<WorkingGroupChair>,
	publishedChairs: Array<WorkingGroupChair>,
): Array<WorkingGroupChair & { lifecycleStatus?: RelationLifecycleStatus }> {
	const publishedByPersonId = new Map(
		publishedChairs.map((chair) => [chair.personId, chair] as const),
	);

	return draftChairs.map((chair) => {
		const published = publishedByPersonId.get(chair.personId);

		if (published == null) {
			return { ...chair, lifecycleStatus: "new" };
		}

		if (durationKey(chair.duration) !== durationKey(published.duration)) {
			return { ...chair, lifecycleStatus: "changed" };
		}

		return chair;
	});
}
