"use server";

import * as schema from "@dariah-eric/database/schema";

import { UpdateServiceActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/internal-services/_lib/update-service.schema";
import { eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";

export const updateServiceAction = createMutationAction({
	schema: UpdateServiceActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "internal_services" },
	revalidate: "/[locale]/dashboard/administrator/internal-services",
	redirect: "/dashboard/administrator/internal-services",

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

		const relations: Array<typeof schema.servicesToOrganisationalUnits.$inferInsert> = [];

		if (ownerRole != null) {
			for (const unitId of input.ownerUnitIds) {
				relations.push({
					serviceId: input.id,
					organisationalUnitId: unitId,
					roleId: ownerRole.id,
				});
			}
		}

		if (providerRole != null) {
			for (const unitId of input.providerUnitIds) {
				relations.push({
					serviceId: input.id,
					organisationalUnitId: unitId,
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
