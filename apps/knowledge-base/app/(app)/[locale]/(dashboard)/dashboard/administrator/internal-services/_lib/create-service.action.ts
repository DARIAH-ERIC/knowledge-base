"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError } from "@dariah-eric/next-lib/actions";
import { getExtracted } from "next-intl/server";

import { CreateServiceActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-services/_lib/create-service.schema";
import { isPublishedEntityVersions } from "@/lib/data/current-entity-version";
import { db } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const createServiceAction = createMutationAction({
	schema: CreateServiceActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "internal_services" },
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
		const [serviceType] = await tx
			.select()
			.from(schema.serviceTypes)
			.where(eq(schema.serviceTypes.type, "internal"));
		assert(serviceType);

		const [service] = await tx
			.insert(schema.services)
			.values({
				name: input.name,
				typeId: serviceType.id,
				statusId: input.statusId,
				comment: input.comment,
				dariahBranding: input.dariahBranding,
				monitoring: input.monitoring,
				metadata: input.metadata ?? {},
				privateSupplier: input.privateSupplier,
			})
			.returning({ id: schema.services.id });
		assert(service);

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
					serviceId: service.id,
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
					serviceId: service.id,
					organisationalUnitDocumentId,
					roleId: providerRole.id,
				});
			}
		}

		if (relations.length > 0) {
			await tx.insert(schema.servicesToOrganisationalUnits).values(relations);
		}

		return { subjectId: service.id };
	},
});
