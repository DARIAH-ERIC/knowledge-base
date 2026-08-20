import { assert } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { faker as f } from "@faker-js/faker";
import { v7 as uuidv7 } from "uuid";
import { describe, expect, it } from "vitest";

import type { Database } from "@/middlewares/db";
import type { SiteMetadata } from "@/routes/site-metadata/schemas";
import { eq } from "@/services/db/sql";
import { createTestClient } from "~/test/lib/create-test-client";
import { withTransaction } from "~/test/lib/with-transaction";

async function seed(db: Database) {
	const title = f.company.name();
	const description = f.lorem.paragraph();
	const ogTitle = f.lorem.sentence();
	const ogDescription = f.lorem.sentence();

	await db
		.insert(schema.siteMetadata)
		.values({ title, description, ogTitle, ogDescription })
		.onConflictDoUpdate({
			target: schema.siteMetadata.id,
			set: { title, description, ogTitle, ogDescription },
		});

	return { title, description, ogTitle, ogDescription };
}

/** The published DARIAH-EU ERIC version, seeded by migration in every database. */
async function getPublishedEricVersionId(db: Database) {
	const eric = await db.query.organisationalUnits.findFirst({
		where: {
			entityVersion: {
				status: { type: "published" },
				entity: { slug: "dariah-eu" },
			},
			type: { type: "eric" },
		},
		columns: { id: true },
	});

	assert(eric, "No published dariah-eu ERIC in database.");

	return eric.id;
}

/**
 * Give the ERIC exactly one contact email and one social media account. Existing links are dropped
 * first so the response can be asserted exhaustively rather than with `arrayContaining`; everything
 * is rolled back with the surrounding transaction.
 */
async function seedEricContactDetails(db: Database) {
	const ericVersionId = await getPublishedEricVersionId(db);

	const socialMediaType = await db.query.socialMediaTypes.findFirst({
		columns: { id: true },
		where: { type: "mastodon" },
	});
	assert(socialMediaType, "No mastodon social media type in database.");

	const email = f.internet.email();

	await db
		.update(schema.organisationalUnits)
		.set({ email })
		.where(eq(schema.organisationalUnits.id, ericVersionId));

	await db
		.delete(schema.organisationalUnitsToSocialMedia)
		.where(eq(schema.organisationalUnitsToSocialMedia.organisationalUnitId, ericVersionId));

	const socialMedia = { id: uuidv7(), name: f.company.name(), url: f.internet.url() };

	await db.insert(schema.socialMedia).values({ ...socialMedia, typeId: socialMediaType.id });
	await db.insert(schema.organisationalUnitsToSocialMedia).values({
		organisationalUnitId: ericVersionId,
		socialMediaId: socialMedia.id,
		position: 0,
	});

	return { email, socialMedia };
}

/** Strip the ERIC back to no contact details at all. */
async function clearEricContactDetails(db: Database) {
	const ericVersionId = await getPublishedEricVersionId(db);

	await db
		.update(schema.organisationalUnits)
		.set({ email: null })
		.where(eq(schema.organisationalUnits.id, ericVersionId));

	await db
		.delete(schema.organisationalUnitsToSocialMedia)
		.where(eq(schema.organisationalUnitsToSocialMedia.organisationalUnitId, ericVersionId));
}

describe("site-metadata", () => {
	describe("GET /api/site-metadata", () => {
		it("should return site metadata", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const { title, ogTitle } = await seed(db);

				const response = await client["site-metadata"].$get();

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as SiteMetadata;

				expect(data).toMatchObject({ title, ogTitle });
				expect(data.ogImage).toBeNull();
			});
		});

		it("should return seeded title when metadata exists", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				const { title } = await seed(db);

				const response = await client["site-metadata"].$get();

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as SiteMetadata;

				expect(data).toMatchObject({ title });
			});
		});
	});

	/**
	 * DARIAH-EU has no entity page and no endpoint of its own, so its contact email and social media
	 * accounts ride along on the site metadata.
	 */
	describe("DARIAH-EU contact details", () => {
		it("should include the ERIC email and social media accounts", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				await seed(db);
				const { email, socialMedia } = await seedEricContactDetails(db);

				const response = await client["site-metadata"].$get();

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as SiteMetadata;

				expect(data.email).toBe(email);
				expect(data.socialMedia).toStrictEqual([
					{ ...socialMedia, duration: null, type: "mastodon" },
				]);
			});
		});

		it("should return no contact details when the ERIC has none", async () => {
			await withTransaction(async (db) => {
				const client = createTestClient(db);

				await seed(db);
				await clearEricContactDetails(db);

				const response = await client["site-metadata"].$get();

				expect(response.status).toBe(200);

				/** @see {@link https://github.com/honojs/hono/issues/2280} */
				const data = (await response.json()) as SiteMetadata;

				expect(data.email).toBeNull();
				expect(data.socialMedia).toStrictEqual([]);
			});
		});
	});
});
