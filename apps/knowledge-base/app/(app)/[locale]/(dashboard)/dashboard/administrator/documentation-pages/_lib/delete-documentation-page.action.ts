"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertAdmin } from "@/lib/auth/session";
import { deleteDocumentVersionTail } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function deleteDocumentationPageAction(id: string): Promise<void> {
	const auditSession = await assertAdmin();

	await db.transaction(async (tx) => {
		const entityVersion = await tx.query.entityVersions.findFirst({
			where: { id },
			columns: { id: true, entityId: true },
		});

		assert(entityVersion);

		await tx
			.delete(schema.documentationPages)
			.where(eq(schema.documentationPages.id, entityVersion.id));
		await deleteDocumentVersionTail(tx, entityVersion.id, entityVersion.entityId);
	});

	await recordAuditEvent(db, {
		actorUserId: auditSession?.user.id,
		action: "delete",
		subjectType: "documentation_pages",
		subjectId: id,
		summary: {},
	});

	revalidatePath("/[locale]/dashboard/website/documentation-pages", "layout");
}
