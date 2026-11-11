import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import slugify from "@sindresorhus/slugify";
import type { JSONContent } from "@tiptap/core";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import { createTestClient } from "~/test/lib/create-test-client";
import { seedContentBlock } from "~/test/lib/seed-content-block";
import { withTransaction } from "~/test/lib/with-transaction";

async function getPublishedStatusId(db: Database): Promise<string> {
	const status = await db.query.entityStatus.findFirst({
		columns: { id: true },
		where: { type: "published" },
	});
	assert(status, "No entity status in database.");
	return status.id;
}

async function getNewsTypeId(db: Database): Promise<string> {
	const entityType = await db.query.entityTypes.findFirst({
		columns: { id: true },
		where: { type: "news" },
	});
	assert(entityType, "No news entity type in database.");
	return entityType.id;
}

async function seedImageAsset(
	db: Database,
	caption: JSONContent | null = null,
): Promise<{ id: string; key: string }> {
	const id = uuidv7();
	const key = `images/${id}.jpg`;

	await db.insert(schema.assets).values({
		id,
		key,
		label: f.lorem.words(2),
		alt: "Alt text",
		caption,
		mimeType: "image/jpeg",
		width: 1200,
		height: 800,
	});

	return { id, key };
}

/** A published news item whose `content` field holds the given rich-text document. */
async function seedNewsItemWithContent(db: Database, content: JSONContent) {
	const [statusId, typeId, image] = await Promise.all([
		getPublishedStatusId(db),
		getNewsTypeId(db),
		seedImageAsset(db),
	]);

	const entityId = uuidv7();
	const versionId = uuidv7();
	const title = f.lorem.sentence();

	await db.insert(schema.entities).values({ id: entityId, slug: slugify(title), typeId });
	await db.insert(schema.entityVersions).values({ id: versionId, entityId, statusId });
	await db.insert(schema.news).values({
		id: versionId,
		title,
		summary: f.lorem.paragraph(),
		publicationDate: f.date.past(),
		imageId: image.id,
	});

	await seedContentBlock(db, versionId, typeId, "content", content);

	return { id: versionId };
}

function paragraph(text: string): JSONContent {
	return { type: "paragraph", content: [{ type: "text", text }] };
}

function caption(text: string): JSONContent {
	return { type: "doc", content: [paragraph(text)] };
}

describe("images nested in rich text", () => {
	it("should resolve an image in a list item or blockquote to an image block's fields", async () => {
		await withTransaction(async (db) => {
			const listed = await seedImageAsset(db, caption("Asset caption."));
			const quoted = await seedImageAsset(db);
			const { id } = await seedNewsItemWithContent(db, {
				type: "doc",
				content: [
					{
						type: "bulletList",
						content: [
							{
								type: "listItem",
								content: [
									paragraph("Step one."),
									{
										type: "assetImage",
										attrs: { imageKey: listed.key, caption: null, captionMode: "inherit" },
									},
								],
							},
						],
					},
					{
						type: "blockquote",
						content: [
							{
								type: "assetImage",
								attrs: {
									imageKey: quoted.key,
									caption: caption("Own caption."),
									captionMode: "override",
								},
							},
						],
					},
				],
			});

			const response = await createTestClient(db).news[":id"].$get({ param: { id } });
			const data = await response.json();

			assert("content" in data);
			const [block] = data.content as Array<{ type: string; content: JSONContent }>;
			expect(block?.type).toBe("rich_text");

			const [list, quote] = block!.content.content!;
			const listImage = list!.content![0]!.content![1]!;
			const quoteImage = quote!.content![0]!;

			expect(listImage).toMatchObject({
				type: "assetImage",
				attrs: {
					// oxlint-disable-next-line typescript/no-unsafe-assignment
					image: { srcUrl: expect.stringContaining(listed.key), alt: "Alt text" },
					caption: caption("Asset caption."),
					captionSource: "asset",
				},
			});
			expect(listImage.attrs).not.toHaveProperty("imageKey");
			expect(listImage.attrs!.image).not.toHaveProperty("caption");
			expect(quoteImage.attrs).toMatchObject({
				caption: caption("Own caption."),
				captionSource: "block",
			});
		});
	});

	it("should keep an image whose asset is gone, with no image", async () => {
		await withTransaction(async (db) => {
			const { id } = await seedNewsItemWithContent(db, {
				type: "doc",
				content: [
					{
						type: "blockquote",
						content: [
							{
								type: "assetImage",
								attrs: { imageKey: "images/missing.jpg", caption: null, captionMode: "inherit" },
							},
						],
					},
				],
			});

			const response = await createTestClient(db).news[":id"].$get({ param: { id } });
			const data = await response.json();

			assert("content" in data);
			const [block] = data.content as Array<{ content: JSONContent }>;
			expect(block!.content.content![0]!.content![0]!.attrs).toEqual({
				image: null,
				caption: null,
				captionSource: null,
			});
		});
	});
});
