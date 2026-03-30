import { eq, inArray, or, sql } from "@dariah-eric/database";
import { createClient } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

export const E2E_TEST_ASSET_KEY = "e2e-test-asset";
export const E2E_TEST_ASSET_LABEL = "E2E Test Asset";

type Database = ReturnType<typeof createClient>;

/**
 * Worker-scoped service that provides DB access and test-data helpers.
 *
 * Each test worker gets its own `DatabaseService` instance (and therefore its
 * own pg pool). Workers inherit env vars from the main Playwright process
 * (which called dotenvx in playwright.config.ts), so the env validation inside
 * @dariah-eric/database/client passes at import time.
 */
export class DatabaseService {
	private readonly db: Database;

	constructor() {
		this.db = createClient();
	}

	/** Returns the asset inserted by globalSetup. */
	async getTestAsset(): Promise<{ id: string; key: string }> {
		const asset = await this.db.query.assets.findFirst({
			where: { key: E2E_TEST_ASSET_KEY },
			columns: { id: true, key: true },
		});

		if (asset == null) {
			throw new Error(
				`Test asset "${E2E_TEST_ASSET_KEY}" not found — make sure globalSetup ran successfully.`,
			);
		}

		return asset;
	}

	/** Returns any project scope from the database (needed as a required field). */
	async getProjectScope(): Promise<{ id: string; scope: string }> {
		const [scope] = await this.db
			.select({ id: schema.projectScopes.id, scope: schema.projectScopes.scope })
			.from(schema.projectScopes)
			.limit(1);

		if (scope == null) {
			throw new Error("No project scopes found in the database.");
		}

		return scope;
	}

	/**
	 * Cascade-deletes a project and all its related records.
	 * Replicates the logic in `delete-project.action.ts`.
	 */
	async deleteProject(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const partners = await tx
				.select({ id: schema.projectsToOrganisationalUnits.id })
				.from(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectId, entityId));

			if (partners.length > 0) {
				const partnerIds = partners.map((p) => {
					return p.id;
				});

				await tx
					.delete(schema.projectsContributions)
					.where(inArray(schema.projectsContributions.projectPartnerId, partnerIds));

				await tx
					.delete(schema.projectsToOrganisationalUnits)
					.where(inArray(schema.projectsToOrganisationalUnits.id, partnerIds));
			}

			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx.delete(schema.projects).where(eq(schema.projects.id, entityId));
			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all projects whose name starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerProjects(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const projects = await this.db
			.select({ id: schema.projects.id })
			.from(schema.projects)
			.where(sql`${schema.projects.name} LIKE ${`${prefix}%`}`);

		for (const project of projects) {
			await this.deleteProject(project.id);
		}
	}

	/**
	 * Cascade-deletes a page item and all its related records.
	 * Replicates the logic in `delete-page-item.action.ts`.
	 */
	async deletePageItem(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx.delete(schema.pages).where(eq(schema.pages.id, entityId));
			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all pages whose title starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerPageItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const pages = await this.db
			.select({ id: schema.pages.id })
			.from(schema.pages)
			.where(sql`${schema.pages.title} LIKE ${`${prefix}%`}`);

		for (const page of pages) {
			await this.deletePageItem(page.id);
		}
	}

	/**
	 * Cascade-deletes an impact case study and all its related records.
	 * Replicates the logic in `delete-impact-case-study.action.ts`.
	 */
	async deleteImpactCaseStudy(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx
				.delete(schema.impactCaseStudiesToPersons)
				.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, entityId));

			await tx.delete(schema.impactCaseStudies).where(eq(schema.impactCaseStudies.id, entityId));

			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all impact case studies whose title starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerImpactCaseStudies(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.impactCaseStudies.id })
			.from(schema.impactCaseStudies)
			.where(sql`${schema.impactCaseStudies.title} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteImpactCaseStudy(item.id);
		}
	}

	/**
	 * Cascade-deletes a spotlight article and all its related records.
	 * Replicates the logic in `delete-spotlight-article.action.ts`.
	 */
	async deleteSpotlightArticle(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx.delete(schema.spotlightArticles).where(eq(schema.spotlightArticles.id, entityId));

			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all spotlight articles whose title starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerSpotlightArticles(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.spotlightArticles.id })
			.from(schema.spotlightArticles)
			.where(sql`${schema.spotlightArticles.title} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteSpotlightArticle(item.id);
		}
	}

	/**
	 * Cascade-deletes an event and all its related records.
	 * Replicates the logic in `delete-event.action.ts`.
	 */
	async deleteEvent(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx.delete(schema.events).where(eq(schema.events.id, entityId));
			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all events whose title starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerEvents(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.events.id })
			.from(schema.events)
			.where(sql`${schema.events.title} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteEvent(item.id);
		}
	}

	/**
	 * Cascade-deletes a news item and all its related records.
	 * Replicates the logic in `delete-news-item.action.ts`.
	 */
	async deleteNewsItem(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx.delete(schema.news).where(eq(schema.news.id, entityId));
			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all news items whose title starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerNewsItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.news.id })
			.from(schema.news)
			.where(sql`${schema.news.title} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteNewsItem(item.id);
		}
	}

	/**
	 * Cascade-deletes a person and all their related records.
	 * Replicates the logic in `delete-person.action.ts`.
	 */
	async deletePerson(entityId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(schema.personsToOrganisationalUnits)
				.where(eq(schema.personsToOrganisationalUnits.personId, entityId));

			const entityFields = await tx
				.select({ id: schema.fields.id })
				.from(schema.fields)
				.where(eq(schema.fields.entityId, entityId));

			if (entityFields.length > 0) {
				const fieldIds = entityFields.map((f) => {
					return f.id;
				});

				await tx
					.delete(schema.contentBlocks)
					.where(inArray(schema.contentBlocks.fieldId, fieldIds));
				await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, entityId),
						eq(schema.entitiesToEntities.relatedEntityId, entityId),
					),
				);

			await tx.delete(schema.persons).where(eq(schema.persons.id, entityId));
			await tx.delete(schema.entities).where(eq(schema.entities.id, entityId));
		});
	}

	/**
	 * Finds all persons whose name starts with `[e2e-worker-{workerIndex}]`
	 * and deletes them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerPersons(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.persons.id })
			.from(schema.persons)
			.where(sql`${schema.persons.name} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deletePerson(item.id);
		}
	}

	/** Closes the underlying pg pool. Called in worker teardown. */
	async close(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		await (this.db as any).$client?.end?.();
	}
}
