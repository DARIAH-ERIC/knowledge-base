"use server";

import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { UpdateServiceActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-services/_lib/update-service.schema";
import { isPublishedEntityVersions } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const updateServiceAction = createMutationAction({
	schema: UpdateServiceActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "internal_services" },
	revalidate: "/[locale]/dashboard/administrator/internal-services",
	redirect: "/dashboard/administrator/internal-services",

	async preCheck({ input }) {
		const t = await getExtracted();
		const unitIds = [...new Set([...input.ownerUnitIds, ...input.providerUnitIds])];

		if (!(await isPublishedEntityVersions(db, unitIds))) {
			return createActionStateError({
				message: t("Relations can only target published entities."),
			});
		}

		return undefined;
	},

	async mutate(tx, input) {
		await tx
			.update(schema.services)
			.set({
				name: input.name,
				statusId: input.statusId,
				comment: input.comment,
				dariahBranding: input.dariahBranding,
				monitoring: input.monitoring,
				metadata: input.metadata ?? {},
				privateSupplier: input.privateSupplier,
			})
			.where(eq(schema.services.id, input.id));

		await tx
			.delete(schema.servicesToOrganisationalUnits)
			.where(eq(schema.servicesToOrganisationalUnits.serviceId, input.id));

		const ownerRole = await tx.query.organisationalUnitServiceRoles.findFirst({
			where: { role: "service_owner" },
			columns: { id: true },
		});

		const providerRole = await tx.query.organisationalUnitServiceRoles.findFirst({
			where: { role: "service_provider" },
			columns: { id: true },
		});

		// The picker submits org-unit *version* ids; the relation is document-level, so resolve each to
		// its document id.
		const unitVersionIds = [...new Set([...input.ownerUnitIds, ...input.providerUnitIds])];
		const unitDocuments =
			unitVersionIds.length > 0
				? await tx
						.select({
							versionId: schema.entityVersions.id,
							documentId: schema.entityVersions.entityId,
						})
						.from(schema.entityVersions)
						.where(inArray(schema.entityVersions.id, unitVersionIds))
				: [];
		const documentByVersion = new Map(unitDocuments.map((r) => [r.versionId, r.documentId]));

		const relations: Array<typeof schema.servicesToOrganisationalUnits.$inferInsert> = [];

		if (ownerRole != null) {
			for (const unitId of input.ownerUnitIds) {
				const organisationalUnitDocumentId = documentByVersion.get(unitId);
				if (organisationalUnitDocumentId == null) {
					continue;
				}
				relations.push({
					serviceId: input.id,
					organisationalUnitDocumentId,
					roleId: ownerRole.id,
				});
			}
		}

		if (providerRole != null) {
			for (const unitId of input.providerUnitIds) {
				const organisationalUnitDocumentId = documentByVersion.get(unitId);
				if (organisationalUnitDocumentId == null) {
					continue;
				}
				relations.push({
					serviceId: input.id,
					organisationalUnitDocumentId,
					roleId: providerRole.id,
				});
			}
		}

		if (relations.length > 0) {
			await tx.insert(schema.servicesToOrganisationalUnits).values(relations);
		}

		return { subjectId: input.id };
	},
});
