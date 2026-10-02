"use server";

import * as schema from "@dariah-eric/database/schema";

import { resolveAuditSubjectLabel } from "@/lib/data/audit-log";
import { assertNotReferencedByReports } from "@/lib/data/report-references";
import { eq } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";

export const deleteSocialMediaAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "delete", subjectType: "social_media" },
	revalidate: "/[locale]/dashboard/administrator/social-media",

	async mutate(tx, [id]: [string]) {
		await assertNotReferencedByReports(tx, { type: "social_media", id });

		// Snapshot the label while the row still exists, so the audit log doesn't fall back to the uuid.
		const subjectLabel = await resolveAuditSubjectLabel("social_media", id, tx);

		await tx.delete(schema.socialMedia).where(eq(schema.socialMedia.id, id));

		return { subjectId: id, subjectLabel };
	},
});
