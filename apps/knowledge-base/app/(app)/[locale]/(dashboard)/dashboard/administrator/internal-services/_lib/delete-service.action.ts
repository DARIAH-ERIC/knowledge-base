"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteServiceAction(id: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		await tx
			.delete(schema.countryReportServiceKpis)
			.where(eq(schema.countryReportServiceKpis.serviceId, id));
		await tx
			.delete(schema.countryReportServices)
			.where(eq(schema.countryReportServices.serviceId, id));
		await tx
			.delete(schema.servicesToSocialMedia)
			.where(eq(schema.servicesToSocialMedia.serviceId, id));
		await tx
			.delete(schema.servicesToOrganisationalUnits)
			.where(eq(schema.servicesToOrganisationalUnits.serviceId, id));
		await tx.delete(schema.services).where(eq(schema.services.id, id));
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession.user.id,
		action: "delete",
		subjectType: "internal_services",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/administrator/internal-services", "layout");
}
