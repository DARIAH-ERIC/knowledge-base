"use server";

import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq, inArray } from "@/lib/db/sql";

export async function deleteDocumentationPageAction(id: string): Promise<void> {
	await assertAdmin();

	await db.transaction(async (tx) => {
		const entityFields = await tx
			.select({ id: schema.fields.id })
			.from(schema.fields)
			.where(eq(schema.fields.entityId, id));

		if (entityFields.length > 0) {
			const fieldIds = entityFields.map((field) => {
				return field.id;
			});

			await tx.delete(schema.contentBlocks).where(inArray(schema.contentBlocks.fieldId, fieldIds));
			await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
		}

		await tx.delete(schema.documentationPages).where(eq(schema.documentationPages.id, id));

		await tx.delete(schema.entities).where(eq(schema.entities.id, id));
	});

	revalidatePath("/[locale]/dashboard/website/documentation-pages", "layout");
}
