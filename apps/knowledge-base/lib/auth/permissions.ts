import type { User } from "@dariah-eric/auth";
import { and, eq, inArray, sql } from "@dariah-eric/database/sql";
import { db } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { getLocale } from "next-intl/server";

import { redirect } from "@/lib/navigation/navigation";

export type Action = "read" | "create" | "update" | "delete" | "confirm";

export type Resource =
	| { type: "organisational_unit"; id: string }
	| { type: "country_report"; id: string }
	| { type: "working_group_report"; id: string };

const chairRoles = ["is_chair_of", "is_vice_chair_of", "is_director_of"] as const;
const memberRoles = ["is_member_of"] as const;
const coordinatorRoles = ["national_coordinator", "national_coordinator_deputy"] as const;
const representativeRoles = ["national_representative", "national_representative_deputy"] as const;

async function hasActiveRelation(
	personId: string,
	orgUnitId: string,
	roleTypes: ReadonlyArray<(typeof schema.personRoleTypesEnum)[number]>,
): Promise<boolean> {
	const rows = await db
		.select({ id: schema.personsToOrganisationalUnits.id })
		.from(schema.personsToOrganisationalUnits)
		.innerJoin(
			schema.personRoleTypes,
			eq(schema.personRoleTypes.id, schema.personsToOrganisationalUnits.roleTypeId),
		)
		.where(
			and(
				eq(schema.personsToOrganisationalUnits.personId, personId),
				eq(schema.personsToOrganisationalUnits.organisationalUnitId, orgUnitId),
				inArray(schema.personRoleTypes.type, roleTypes),
				sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
			),
		)
		.limit(1);

	return rows.length > 0;
}

export async function can(user: User, action: Action, resource: Resource): Promise<boolean> {
	if (user.role === "admin") return true;

	if (resource.type === "organisational_unit") {
		if (action !== "update") return false;
		if (user.personId == null) return false;
		return hasActiveRelation(user.personId, resource.id, chairRoles);
	}

	if (resource.type === "working_group_report") {
		if (action !== "update" && action !== "confirm") return false;
		if (user.personId == null) return false;

		const report = await db.query.workingGroupReports.findFirst({
			where: { id: resource.id },
			columns: { workingGroupId: true },
		});
		if (report == null) return false;

		if (action === "confirm") {
			return hasActiveRelation(user.personId, report.workingGroupId, chairRoles);
		}

		return (
			(await hasActiveRelation(user.personId, report.workingGroupId, chairRoles)) ||
			hasActiveRelation(user.personId, report.workingGroupId, memberRoles)
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (resource.type === "country_report") {
		if (action !== "update" && action !== "confirm") return false;

		const report = await db.query.countryReports.findFirst({
			where: { id: resource.id },
			columns: { countryId: true },
		});
		if (report == null) return false;

		if (action === "update" && user.organisationalUnitId === report.countryId) return true;

		if (user.personId == null) return false;

		if (action === "confirm") {
			return hasActiveRelation(user.personId, report.countryId, coordinatorRoles);
		}

		return (
			(await hasActiveRelation(user.personId, report.countryId, coordinatorRoles)) ||
			hasActiveRelation(user.personId, report.countryId, representativeRoles)
		);
	}

	return false;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function assertCan(user: User, action: Action, resource: Resource) {
	const allowed = await can(user, action, resource);

	if (!allowed) {
		const locale = await getLocale();
		redirect({ href: "/dashboard", locale });
	}
}
