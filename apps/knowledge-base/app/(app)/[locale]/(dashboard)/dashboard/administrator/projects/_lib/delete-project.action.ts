"use server";

import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { assertAdmin } from "@/lib/auth/session";
import { deleteDocumentVersionTail } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import {
	deleteWebsiteDocument,
	getWebsiteDocumentDescriptorByEntityId,
} from "@/lib/search/website-index";

export async function deleteProjectAction(id: string): Promise<void> {
	await assertAdmin();

	const descriptor = await db.transaction(async (tx) => {
		const entityVersion = await tx.query.entityVersions.findFirst({
			where: { id },
			columns: { id: true, entityId: true },
		});

		assert(entityVersion);

		const documentId = entityVersion.entityId;
		const documentDescriptor = await getWebsiteDocumentDescriptorByEntityId(documentId);

		await tx
			.delete(schema.projectsToOrganisationalUnits)
			.where(eq(schema.projectsToOrganisationalUnits.projectId, entityVersion.id));
		await tx
			.delete(schema.projectsToSocialMedia)
			.where(eq(schema.projectsToSocialMedia.projectId, entityVersion.id));
		await tx.delete(schema.projects).where(eq(schema.projects.id, entityVersion.id));
		await deleteDocumentVersionTail(tx, entityVersion.id, documentId);

		return documentDescriptor;
	});

	after(async () => {
		if (descriptor != null) {
			await deleteWebsiteDocument(descriptor);
		}
	});

	revalidatePath("/[locale]/dashboard/administrator/projects", "layout");
}
