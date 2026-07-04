/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import {
	getOrganisationalUnitOptions,
	getOrganisationalUnitOptionsByDocumentIds,
} from "@/lib/data/organisational-units";
import { type Transaction, db } from "@/lib/db";
import { unaccentIlike } from "@/lib/db/search";
import { and, count, desc, eq, inArray, or } from "@/lib/db/sql";
import {
	toOrganisationalUnitDocumentOption,
	toOrganisationalUnitDocumentOptionsPage,
} from "@/lib/organisational-unit-options";

export type PublicationSort = "title" | "publicationYear" | "status";

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

export async function getPublicationsForAdmin(
	user: Pick<User, "role">,
	params: {
		limit: number;
		offset: number;
		q?: string;
		sort?: PublicationSort;
		dir?: "asc" | "desc";
	},
) {
	assertAdminUser(user);
	const { limit, offset, q, sort = "title", dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(
					unaccentIlike(schema.publications.title, `%${query}%`),
					unaccentIlike(schema.publications.doi, `%${query}%`),
				)
			: undefined;
	const orderColumn =
		sort === "publicationYear"
			? schema.publications.publicationYear
			: sort === "status"
				? schema.publications.status
				: schema.publications.title;
	const orderBy = dir === "asc" ? orderColumn : desc(orderColumn);

	const [data, aggregate] = await Promise.all([
		db
			.select({
				id: schema.publications.id,
				title: schema.publications.title,
				type: schema.publications.type,
				status: schema.publications.status,
				publicationYear: schema.publications.publicationYear,
				doi: schema.publications.doi,
			})
			.from(schema.publications)
			.where(where)
			.orderBy(orderBy, schema.publications.title)
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.publications).where(where),
	]);

	return { data, limit, offset, total: aggregate.at(0)?.total ?? 0 };
}

export async function getPublicationByIdForAdmin(user: Pick<User, "role">, id: string) {
	assertAdminUser(user);
	const publication = await db.query.publications.findFirst({ where: { id } });
	if (publication == null) {
		return null;
	}

	const relations = await db
		.select({ documentId: schema.publicationsToOrganisationalUnits.organisationalUnitDocumentId })
		.from(schema.publicationsToOrganisationalUnits)
		.where(eq(schema.publicationsToOrganisationalUnits.publicationId, id));
	const options = await getOrganisationalUnitOptionsByDocumentIds(
		relations.map((relation) => relation.documentId),
	);

	return {
		...publication,
		organisationalUnitDocumentIds: options.map((option) => option.documentId),
		selectedOrganisationalUnits: options.map(toOrganisationalUnitDocumentOption),
	};
}

export async function getPublicationFormOptionsForAdmin(user: Pick<User, "role">) {
	assertAdminUser(user);
	const [nationalConsortia, workingGroups] = await Promise.all([
		getOrganisationalUnitOptions({ unitType: "national_consortium" }),
		getOrganisationalUnitOptions({ unitType: "working_group" }),
	]);

	return {
		nationalConsortia: toOrganisationalUnitDocumentOptionsPage(nationalConsortia),
		workingGroups: toOrganisationalUnitDocumentOptionsPage(workingGroups),
	};
}

export async function assertPublicationOrganisationalUnits(
	tx: Transaction,
	documentIds: ReadonlyArray<string>,
): Promise<void> {
	if (documentIds.length === 0) {
		return;
	}
	const rows = await tx
		.select({ id: schema.entities.id })
		.from(schema.entities)
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.entities.id),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.documentLifecycle.publishedId),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			and(
				inArray(schema.entities.id, [...documentIds]),
				inArray(schema.organisationalUnitTypes.type, ["national_consortium", "working_group"]),
			),
		);
	if (new Set(rows.map((row) => row.id)).size !== new Set(documentIds).size) {
		throw new Error(
			"A publication can only be related to published national consortia or working groups.",
		);
	}
}
