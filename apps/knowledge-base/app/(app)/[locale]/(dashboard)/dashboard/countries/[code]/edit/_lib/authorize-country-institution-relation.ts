import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { getLocale } from "next-intl/server";

import { can } from "@/lib/auth/permissions";
import { getDariahEricDocumentId } from "@/lib/data/unit-relations";
import { type Database, type Transaction, db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { redirect } from "@/lib/navigation/navigation";

/**
 * Whether the user may edit a country the institution is located in. Any `is_located_in` row
 * counts, current or not, matching `getEricInstitutionsForCountry`: every institution a country's
 * Institutions tab lists is one its coordinators can manage.
 */
async function canEditSomeCountryOfInstitution(
	user: User,
	institutionDocumentId: string,
	executor: Database | Transaction,
): Promise<boolean> {
	const countries = await executor
		.select({ documentId: schema.organisationalUnitsRelations.relatedUnitDocumentId })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				eq(schema.organisationalUnitsRelations.unitDocumentId, institutionDocumentId),
				eq(schema.organisationalUnitStatus.status, "is_located_in"),
			),
		);

	return (
		await Promise.all(
			countries.map((country) =>
				can(user, "update", { type: "organisational_unit", id: country.documentId }, executor),
			),
		)
	).some(Boolean);
}

/**
 * Authorize a delegated edit of a "partner institution" relation surfaced on a country dashboard.
 * These relations are `institution -> DARIAH ERIC` edges scoped to a country via the institution's
 * `is_located_in` relation. The caller may manage one only when:
 *
 * - The relation targets DARIAH ERIC (the fixed target of these country-representation edges), and
 * - The caller is scoped to edit (`can update`) a country the institution `is_located_in`.
 *
 * Admins always pass. Redirects to `/dashboard` when not allowed, mirroring {@link assertCan}.
 */
export async function assertCanManageCountryInstitutionRelation(
	user: User,
	params: Readonly<{ institutionDocumentId: string; relatedUnitDocumentId: string }>,
	executor: Database | Transaction = db,
): Promise<void> {
	if (user.role !== "admin") {
		const ericDocumentId = await getDariahEricDocumentId();

		const targetsEric = ericDocumentId != null && params.relatedUnitDocumentId === ericDocumentId;

		const canEditSomeCountry =
			targetsEric &&
			(await canEditSomeCountryOfInstitution(user, params.institutionDocumentId, executor));

		if (!canEditSomeCountry) {
			const locale = await getLocale();
			redirect({ href: "/dashboard", locale });
		}
	}
}

/**
 * Authorize a delegated edit of an institution's own metadata. The caller may edit an institution
 * only when it `is_located_in` a country they are scoped to edit. Admins always pass; redirects
 * otherwise.
 */
export async function assertCanEditCountryInstitution(
	user: User,
	institutionDocumentId: string,
	executor: Database | Transaction = db,
): Promise<void> {
	if (user.role === "admin") {
		return;
	}

	if (!(await canEditSomeCountryOfInstitution(user, institutionDocumentId, executor))) {
		const locale = await getLocale();
		redirect({ href: "/dashboard", locale });
	}
}
