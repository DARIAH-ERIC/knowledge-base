import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { Transaction } from "@/lib/db";
import { eq } from "@/lib/db/sql";

export async function ensureEntityVersionField(
	tx: Transaction,
	entityVersionId: string,
	fieldName?: string,
): Promise<{ id: string }> {
	const existingField = await tx.query.fields.findFirst({
		where:
			fieldName != null
				? {
						entityVersionId,
						name: { fieldName },
					}
				: { entityVersionId },
		columns: { id: true },
	});

	if (existingField != null) {
		return existingField;
	}

	const [version] = await tx
		.select({ entityTypeId: schema.entities.typeId })
		.from(schema.entityVersions)
		.innerJoin(schema.entities, eq(schema.entityVersions.entityId, schema.entities.id))
		.where(eq(schema.entityVersions.id, entityVersionId))
		.limit(1);

	assert(version);

	const fieldNameRow = await tx.query.entityTypesFieldsNames.findFirst({
		where:
			fieldName != null
				? { entityTypeId: version.entityTypeId, fieldName }
				: { entityTypeId: version.entityTypeId },
		columns: { id: true },
	});

	assert(fieldNameRow);

	const [field] = await tx
		.insert(schema.fields)
		.values({ entityVersionId, fieldNameId: fieldNameRow.id })
		.returning({ id: schema.fields.id });

	assert(field);

	return field;
}

export async function upsertRichTextEntityVersionField(
	tx: Transaction,
	entityVersionId: string,
	fieldName: string,
	content: schema.RichTextContentBlock["content"],
): Promise<void> {
	const field = await ensureEntityVersionField(tx, entityVersionId, fieldName);

	const richTextType = await tx.query.contentBlockTypes.findFirst({
		where: { type: "rich_text" },
		columns: { id: true },
	});

	assert(richTextType);

	const existingContentBlock = await tx.query.contentBlocks.findFirst({
		where: {
			fieldId: field.id,
			type: { type: "rich_text" },
		},
		columns: { id: true },
	});

	if (existingContentBlock == null) {
		const [newContentBlock] = await tx
			.insert(schema.contentBlocks)
			.values({ fieldId: field.id, typeId: richTextType.id, position: 0 })
			.returning({ id: schema.contentBlocks.id });

		assert(newContentBlock);

		await tx.insert(schema.richTextContentBlocks).values({
			id: newContentBlock.id,
			content,
		});

		return;
	}

	const existingRichText = await tx.query.richTextContentBlocks.findFirst({
		where: { id: existingContentBlock.id },
		columns: { id: true },
	});

	if (existingRichText != null) {
		await tx
			.update(schema.richTextContentBlocks)
			.set({ content })
			.where(eq(schema.richTextContentBlocks.id, existingContentBlock.id));
	} else {
		await tx.insert(schema.richTextContentBlocks).values({
			id: existingContentBlock.id,
			content,
		});
	}
}
