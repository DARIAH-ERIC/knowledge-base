"use server";

import * as schema from "@dariah-eric/database/schema";

import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { assertNotReferencedByReports } from "@/lib/data/report-references";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";

export const deleteServiceAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "internal_services" },
	revalidate: "/[locale]/dashboard/administrator/internal-services",

	async mutate(tx, [id]: [string]) {
		const service = await tx.query.services.findFirst({
			where: { id },
			columns: { sshocMarketplaceId: true },
		});
		if (service == null) {
			throw new UserFacingError("record-not-found");
		}
		// Marketplace services are owned by the SSHOC ingest, which would recreate them anyway.
		if (service.sshocMarketplaceId != null) {
			throw new UserFacingError("sshoc-service-deletion");
		}

		await assertNotReferencedByReports(tx, { type: "service", id });

		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("internal_services", id, tx);

		await tx
			.delete(schema.servicesToSocialMedia)
			.where(eq(schema.servicesToSocialMedia.serviceId, id));
		await tx
			.delete(schema.servicesToOrganisationalUnits)
			.where(eq(schema.servicesToOrganisationalUnits.serviceId, id));
		await tx.delete(schema.services).where(eq(schema.services.id, id));

		return { subjectId: id, subjectLabel };
	},
});
