import { type Transaction, createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { and, eq, inArray, or, sql } from "@dariah-eric/database/sql";
import type { InferOk } from "better-result";

import { env } from "../../../config/env.config";

export const E2E_TEST_ASSET_KEY = "images/e2e-test-asset";
export const E2E_TEST_ASSET_LABEL = "E2E Test Asset";

type Database = InferOk<ReturnType<typeof createDatabaseService>>;

/**
 * Worker-scoped service that provides DB access and test-data helpers.
 *
 * Each test worker gets its own `DatabaseService` instance (and therefore its own pg pool). Workers
 * inherit env vars from the main Playwright process (which called dotenvx in
 * playwright.config.ts).
 */
export class DatabaseService {
	private readonly db: Database;

	constructor() {
		this.db = createDatabaseService({
			connection: {
				database: env.DATABASE_NAME,
				host: env.DATABASE_HOST,
				password: env.DATABASE_PASSWORD,
				port: env.DATABASE_PORT,
				user: env.DATABASE_USER,
			},
			logger: false,
		}).unwrap();
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

	/**
	 * Returns the first entity from the database, formatted as it appears in the "Related entities"
	 * MultipleSelect. Used as a test relation target.
	 */
	async getTestEntity(): Promise<{ id: string; name: string }> {
		const entity = await this.db.query.entities.findFirst({
			columns: { id: true, slug: true },
			with: { type: { columns: { type: true } } },
			orderBy: { slug: "asc" },
		});

		if (entity == null) {
			throw new Error("No entities found in database — required for relation tests.");
		}

		return { id: entity.id, name: entity.slug };
	}

	async getTestEntities(count: number): Promise<Array<{ id: string; name: string }>> {
		const entities = await this.db.query.entities.findMany({
			columns: { id: true, slug: true },
			orderBy: { slug: "asc" },
			limit: count,
		});

		if (entities.length < count) {
			throw new Error(`Expected at least ${String(count)} entities for relation tests.`);
		}

		return entities.map((entity) => {
			return { id: entity.id, name: entity.slug };
		});
	}

	/** Returns related entity and resource IDs for a given entity (by its document DB id). */
	async getEntityRelations(
		entityId: string,
	): Promise<{ relatedEntityIds: Array<string>; relatedResourceIds: Array<string> }> {
		const [entityRows, resourceRows] = await Promise.all([
			this.db
				.select({ relatedEntityId: schema.entitiesToEntities.relatedEntityId })
				.from(schema.entitiesToEntities)
				.where(eq(schema.entitiesToEntities.entityId, entityId)),
			this.db
				.select({ resourceId: schema.entitiesToResources.resourceId })
				.from(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, entityId)),
		]);

		return {
			relatedEntityIds: entityRows.map((r) => r.relatedEntityId),
			relatedResourceIds: resourceRows.map((r) => r.resourceId),
		};
	}

	/** Returns the entitiesToEntities row (including timestamps) for a specific relation. */
	async getEntitiesToEntitiesRow(
		entityId: string,
		relatedEntityId: string,
	): Promise<{ createdAt: Date } | null> {
		const [row] = await this.db
			.select({ createdAt: schema.entitiesToEntities.createdAt })
			.from(schema.entitiesToEntities)
			.where(
				and(
					eq(schema.entitiesToEntities.entityId, entityId),
					eq(schema.entitiesToEntities.relatedEntityId, relatedEntityId),
				),
			)
			.limit(1);

		return row ?? null;
	}

	/**
	 * Finds a news item by exact title. Returns the document entity ID (entities.id) so callers can
	 * use it with getEntityRelations / getEntitiesToEntitiesRow.
	 */
	async getNewsItemByTitle(
		title: string,
	): Promise<{ id: string; imageId: string; summary: string } | null> {
		const [row] = await this.db
			.select({
				id: schema.entityVersions.entityId,
				imageId: schema.news.imageId,
				summary: schema.news.summary,
			})
			.from(schema.news)
			.innerJoin(schema.entityVersions, eq(schema.news.id, schema.entityVersions.id))
			.where(eq(schema.news.title, title))
			.limit(1);

		return row ?? null;
	}

	async getAssetByLabel(label: string): Promise<{ id: string; key: string } | null> {
		const asset = await this.db.query.assets.findFirst({
			where: { label },
			columns: { id: true, key: true },
		});

		return asset ?? null;
	}

	async getNewsContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const [newsItem] = await this.db
			.select({ versionId: schema.news.id })
			.from(schema.news)
			.where(eq(schema.news.title, title))
			.limit(1);

		if (newsItem == null) {
			return [];
		}

		const rows = await this.db
			.select({
				content: sql<unknown>`${schema.richTextContentBlocks.content}`,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
			})
			.from(schema.contentBlocks)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.leftJoin(
				schema.richTextContentBlocks,
				eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
			)
			.where(eq(schema.fields.entityVersionId, newsItem.versionId))
			.orderBy(schema.contentBlocks.position);

		return rows;
	}

	async getWorkingGroupByName(name: string): Promise<{
		acronym: string | null;
		documentId: string;
		id: string;
		imageId: string | null;
		name: string;
		sshocMarketplaceActorId: number | null;
		summary: string | null;
	} | null> {
		const [row] = await this.db
			.select({
				acronym: schema.organisationalUnits.acronym,
				documentId: schema.entityVersions.entityId,
				id: schema.organisationalUnits.id,
				imageId: schema.organisationalUnits.imageId,
				name: schema.organisationalUnits.name,
				sshocMarketplaceActorId: schema.organisationalUnits.sshocMarketplaceActorId,
				summary: schema.organisationalUnits.summary,
			})
			.from(schema.organisationalUnits)
			.innerJoin(schema.entityVersions, eq(schema.organisationalUnits.id, schema.entityVersions.id))
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					eq(schema.organisationalUnits.name, name),
					eq(schema.organisationalUnitTypes.type, "working_group"),
				),
			)
			.limit(1);

		return row ?? null;
	}

	async getWorkingGroupDescriptionByName(name: string): Promise<unknown> {
		const workingGroup = await this.getWorkingGroupByName(name);

		if (workingGroup == null) {
			return null;
		}

		const [row] = await this.db
			.select({ content: sql<unknown>`${schema.richTextContentBlocks.content}` })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityVersionId, workingGroup.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1);

		return row?.content ?? null;
	}

	async getPersonByName(name: string): Promise<{
		documentId: string;
		email: string | null;
		id: string;
		imageId: string;
		name: string;
		orcid: string | null;
		sortName: string;
	} | null> {
		const [row] = await this.db
			.select({
				documentId: schema.entityVersions.entityId,
				email: schema.persons.email,
				id: schema.persons.id,
				imageId: schema.persons.imageId,
				name: schema.persons.name,
				orcid: schema.persons.orcid,
				sortName: schema.persons.sortName,
			})
			.from(schema.persons)
			.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
			.where(eq(schema.persons.name, name))
			.limit(1);

		return row ?? null;
	}

	async getPersonBiographyByName(name: string): Promise<unknown> {
		const person = await this.getPersonByName(name);

		if (person == null) {
			return null;
		}

		const [row] = await this.db
			.select({ content: sql<unknown>`${schema.richTextContentBlocks.content}` })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityVersionId, person.id),
					eq(schema.entityTypesFieldsNames.fieldName, "biography"),
				),
			)
			.limit(1);

		return row?.content ?? null;
	}

	async getSocialMediaByName(name: string): Promise<{
		duration: { start?: Date; end?: Date } | null;
		id: string;
		name: string;
		type: string;
		url: string;
	} | null> {
		const [row] = await this.db
			.select({
				duration: schema.socialMedia.duration,
				id: schema.socialMedia.id,
				name: schema.socialMedia.name,
				type: schema.socialMediaTypes.type,
				url: schema.socialMedia.url,
			})
			.from(schema.socialMedia)
			.innerJoin(schema.socialMediaTypes, eq(schema.socialMedia.typeId, schema.socialMediaTypes.id))
			.where(eq(schema.socialMedia.name, name))
			.limit(1);

		return row ?? null;
	}

	async getProjectByName(name: string): Promise<{
		acronym: string | null;
		call: string | null;
		documentId: string;
		duration: { start: Date; end?: Date } | null;
		funding: number | null;
		id: string;
		imageId: string | null;
		name: string;
		scopeId: string;
		summary: string;
		topic: string | null;
	} | null> {
		const [row] = await this.db
			.select({
				acronym: schema.projects.acronym,
				call: schema.projects.call,
				documentId: schema.entityVersions.entityId,
				duration: schema.projects.duration,
				funding: schema.projects.funding,
				id: schema.projects.id,
				imageId: schema.projects.imageId,
				name: schema.projects.name,
				scopeId: schema.projects.scopeId,
				summary: schema.projects.summary,
				topic: schema.projects.topic,
			})
			.from(schema.projects)
			.innerJoin(schema.entityVersions, eq(schema.projects.id, schema.entityVersions.id))
			.where(eq(schema.projects.name, name))
			.limit(1);

		return row ?? null;
	}

	async getProjectDescriptionByName(name: string): Promise<unknown> {
		const project = await this.getProjectByName(name);

		if (project == null) {
			return null;
		}

		const [row] = await this.db
			.select({ content: sql<unknown>`${schema.richTextContentBlocks.content}` })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityVersionId, project.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1);

		return row?.content ?? null;
	}

	async getServiceByName(name: string): Promise<{
		comment: string | null;
		dariahBranding: boolean | null;
		id: string;
		metadata: unknown;
		monitoring: boolean | null;
		name: string;
		privateSupplier: boolean | null;
		statusId: string;
	} | null> {
		const [row] = await this.db
			.select({
				comment: schema.services.comment,
				dariahBranding: schema.services.dariahBranding,
				id: schema.services.id,
				metadata: schema.services.metadata,
				monitoring: schema.services.monitoring,
				name: schema.services.name,
				privateSupplier: schema.services.privateSupplier,
				statusId: schema.services.statusId,
			})
			.from(schema.services)
			.where(eq(schema.services.name, name))
			.limit(1);

		return row ?? null;
	}

	async getUserByName(name: string): Promise<{
		canManageAdmins: boolean;
		email: string;
		id: string;
		name: string;
		organisationalUnitId: string | null;
		personId: string | null;
		role: "admin" | "user";
	} | null> {
		const [row] = await this.db
			.select({
				canManageAdmins: schema.users.canManageAdmins,
				email: schema.users.email,
				id: schema.users.id,
				name: schema.users.name,
				organisationalUnitId: schema.users.organisationalUnitId,
				personId: schema.users.personId,
				role: schema.users.role,
			})
			.from(schema.users)
			.where(eq(schema.users.name, name))
			.limit(1);

		return row ?? null;
	}

	async getPageItemByTitle(
		title: string,
	): Promise<{ id: string; imageId: string | null; summary: string } | null> {
		const [row] = await this.db
			.select({
				id: schema.entityVersions.entityId,
				imageId: schema.pages.imageId,
				summary: schema.pages.summary,
			})
			.from(schema.pages)
			.innerJoin(schema.entityVersions, eq(schema.pages.id, schema.entityVersions.id))
			.where(eq(schema.pages.title, title))
			.limit(1);

		return row ?? null;
	}

	async getDocumentationPageByTitle(
		title: string,
	): Promise<{ documentId: string; id: string } | null> {
		const [row] = await this.db
			.select({
				documentId: schema.entityVersions.entityId,
				id: schema.documentationPages.id,
			})
			.from(schema.documentationPages)
			.innerJoin(schema.entityVersions, eq(schema.documentationPages.id, schema.entityVersions.id))
			.where(eq(schema.documentationPages.title, title))
			.limit(1);

		return row ?? null;
	}

	async getDocumentationPageContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const documentationPage = await this.getDocumentationPageByTitle(title);

		if (documentationPage == null) {
			return [];
		}

		const rows = await this.db
			.select({
				content: sql<unknown>`${schema.richTextContentBlocks.content}`,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
			})
			.from(schema.contentBlocks)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.leftJoin(
				schema.richTextContentBlocks,
				eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
			)
			.where(eq(schema.fields.entityVersionId, documentationPage.id))
			.orderBy(schema.contentBlocks.position);

		return rows;
	}

	async getEventByTitle(title: string): Promise<{
		duration: { start: Date; end?: Date };
		id: string;
		imageId: string;
		isFullDay: boolean | null;
		location: string | null;
		summary: string;
		website: string | null;
	} | null> {
		const [row] = await this.db
			.select({
				duration: schema.events.duration,
				id: schema.events.id,
				imageId: schema.events.imageId,
				isFullDay: schema.events.isFullDay,
				location: schema.events.location,
				summary: schema.events.summary,
				website: schema.events.website,
			})
			.from(schema.events)
			.where(eq(schema.events.title, title))
			.limit(1);

		return row ?? null;
	}

	async getEventContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const [event] = await this.db
			.select({ id: schema.events.id })
			.from(schema.events)
			.where(eq(schema.events.title, title))
			.limit(1);

		return event != null ? this.getContentBlocksByVersionId(event.id) : [];
	}

	async getImpactCaseStudyByTitle(title: string): Promise<{
		id: string;
		imageId: string;
		summary: string;
	} | null> {
		const [row] = await this.db
			.select({
				id: schema.impactCaseStudies.id,
				imageId: schema.impactCaseStudies.imageId,
				summary: schema.impactCaseStudies.summary,
			})
			.from(schema.impactCaseStudies)
			.where(eq(schema.impactCaseStudies.title, title))
			.limit(1);

		return row ?? null;
	}

	async getImpactCaseStudyContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const [item] = await this.db
			.select({ id: schema.impactCaseStudies.id })
			.from(schema.impactCaseStudies)
			.where(eq(schema.impactCaseStudies.title, title))
			.limit(1);

		return item != null ? this.getContentBlocksByVersionId(item.id) : [];
	}

	async getSpotlightArticleByTitle(title: string): Promise<{
		id: string;
		imageId: string;
		summary: string;
	} | null> {
		const [row] = await this.db
			.select({
				id: schema.spotlightArticles.id,
				imageId: schema.spotlightArticles.imageId,
				summary: schema.spotlightArticles.summary,
			})
			.from(schema.spotlightArticles)
			.where(eq(schema.spotlightArticles.title, title))
			.limit(1);

		return row ?? null;
	}

	async getSpotlightArticleContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const [item] = await this.db
			.select({ id: schema.spotlightArticles.id })
			.from(schema.spotlightArticles)
			.where(eq(schema.spotlightArticles.title, title))
			.limit(1);

		return item != null ? this.getContentBlocksByVersionId(item.id) : [];
	}

	async getFundingCallByTitle(title: string): Promise<{
		duration: { start: Date; end?: Date };
		id: string;
		summary: string | null;
	} | null> {
		const [row] = await this.db
			.select({
				duration: schema.fundingCalls.duration,
				id: schema.fundingCalls.id,
				summary: schema.fundingCalls.summary,
			})
			.from(schema.fundingCalls)
			.where(eq(schema.fundingCalls.title, title))
			.limit(1);

		return row ?? null;
	}

	async getFundingCallContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const item = await this.getFundingCallByTitle(title);

		return item != null ? this.getContentBlocksByVersionId(item.id) : [];
	}

	async getOpportunityByTitle(title: string): Promise<{
		duration: { start: Date; end?: Date };
		id: string;
		sourceId: string;
		summary: string | null;
		website: string | null;
	} | null> {
		const [row] = await this.db
			.select({
				duration: schema.opportunities.duration,
				id: schema.opportunities.id,
				sourceId: schema.opportunities.sourceId,
				summary: schema.opportunities.summary,
				website: schema.opportunities.website,
			})
			.from(schema.opportunities)
			.where(eq(schema.opportunities.title, title))
			.limit(1);

		return row ?? null;
	}

	async getOpportunityContentBlocksByTitle(
		title: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		const item = await this.getOpportunityByTitle(title);

		return item != null ? this.getContentBlocksByVersionId(item.id) : [];
	}

	private async getContentBlocksByVersionId(
		versionId: string,
	): Promise<Array<{ type: string; position: number; content: unknown }>> {
		return this.db
			.select({
				content: sql<unknown>`${schema.richTextContentBlocks.content}`,
				position: schema.contentBlocks.position,
				type: schema.contentBlockTypes.type,
			})
			.from(schema.contentBlocks)
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.contentBlockTypes,
				eq(schema.contentBlocks.typeId, schema.contentBlockTypes.id),
			)
			.leftJoin(
				schema.richTextContentBlocks,
				eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
			)
			.where(eq(schema.fields.entityVersionId, versionId))
			.orderBy(schema.contentBlocks.position);
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

	private async deleteDocumentVersionTail(
		tx: Transaction,
		versionId: string,
		documentId: string,
	): Promise<void> {
		const entityFields = await tx
			.select({ id: schema.fields.id })
			.from(schema.fields)
			.where(eq(schema.fields.entityVersionId, versionId));

		if (entityFields.length > 0) {
			const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);

			await tx.delete(schema.contentBlocks).where(inArray(schema.contentBlocks.fieldId, fieldIds));
			await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
		}

		await tx
			.delete(schema.entitiesToResources)
			.where(eq(schema.entitiesToResources.entityId, documentId));

		await tx
			.delete(schema.entitiesToEntities)
			.where(
				or(
					eq(schema.entitiesToEntities.entityId, documentId),
					eq(schema.entitiesToEntities.relatedEntityId, documentId),
				),
			);

		await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, versionId));
		await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
	}

	private async resolveVersion(
		tx: Transaction,
		versionId: string,
	): Promise<{ versionId: string; documentId: string } | null> {
		const [row] = await tx
			.select({ id: schema.entityVersions.id, entityId: schema.entityVersions.entityId })
			.from(schema.entityVersions)
			.where(eq(schema.entityVersions.id, versionId))
			.limit(1);

		if (row == null) {
			return null;
		}
		return { versionId: row.id, documentId: row.entityId };
	}

	/**
	 * Cascade-deletes a project and all its related records. Replicates the logic in
	 * `delete-project.action.ts`.
	 */
	async deleteProject(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx
				.delete(schema.projectsToOrganisationalUnits)
				.where(eq(schema.projectsToOrganisationalUnits.projectId, versionId));

			await tx
				.delete(schema.projectsToSocialMedia)
				.where(eq(schema.projectsToSocialMedia.projectId, versionId));

			await tx.delete(schema.projects).where(eq(schema.projects.id, versionId));
			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all projects whose name starts with `[e2e-worker-{workerIndex}]` and deletes them. Called
	 * in afterAll to ensure a clean state.
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
	 * Cascade-deletes a page item and all its related records. Replicates the logic in
	 * `delete-page-item.action.ts`.
	 */
	async deletePageItem(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx.delete(schema.pages).where(eq(schema.pages.id, versionId));
			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all pages whose title starts with `[e2e-worker-{workerIndex}]` and deletes them. Called
	 * in afterAll to ensure a clean state.
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
	 * Cascade-deletes an impact case study and all its related records. Replicates the logic in
	 * `delete-impact-case-study.action.ts`.
	 */
	async deleteImpactCaseStudy(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx
				.delete(schema.impactCaseStudiesToPersons)
				.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, versionId));

			await tx.delete(schema.impactCaseStudies).where(eq(schema.impactCaseStudies.id, versionId));

			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all impact case studies whose title starts with `[e2e-worker-{workerIndex}]` and deletes
	 * them. Called in afterAll to ensure a clean state.
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
	 * Cascade-deletes a spotlight article and all its related records. Replicates the logic in
	 * `delete-spotlight-article.action.ts`.
	 */
	async deleteSpotlightArticle(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx
				.delete(schema.spotlightArticlesToPersons)
				.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, versionId));

			await tx.delete(schema.spotlightArticles).where(eq(schema.spotlightArticles.id, versionId));

			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all spotlight articles whose title starts with `[e2e-worker-{workerIndex}]` and deletes
	 * them. Called in afterAll to ensure a clean state.
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
	 * Cascade-deletes an event and all its related records. Replicates the logic in
	 * `delete-event.action.ts`.
	 */
	async deleteEvent(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx.delete(schema.events).where(eq(schema.events.id, versionId));
			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all events whose title starts with `[e2e-worker-{workerIndex}]` and deletes them. Called
	 * in afterAll to ensure a clean state.
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
	 * Cascade-deletes a news item and all its related records. Replicates the logic in
	 * `delete-news-item.action.ts`.
	 */
	async deleteNewsItem(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx.delete(schema.news).where(eq(schema.news.id, versionId));
			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all news items whose title starts with `[e2e-worker-{workerIndex}]` and deletes them.
	 * Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerNewsItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.news)
			.innerJoin(schema.entityVersions, eq(schema.news.id, schema.entityVersions.id))
			.where(sql`${schema.news.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((row) => row.documentId))];

		for (const documentId of documentIds) {
			await this.deleteNewsDocument(documentId);
		}
	}

	/** Deletes assets uploaded by tests after dependent rows have been removed. */
	async cleanupWorkerAssets(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		await this.db.delete(schema.assets).where(sql`${schema.assets.label} LIKE ${`${prefix}%`}`);
	}

	/**
	 * Cascade-deletes a person and all their related records. Replicates the logic in
	 * `delete-person.action.ts`.
	 */
	async deletePerson(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx
				.delete(schema.personsToOrganisationalUnits)
				.where(eq(schema.personsToOrganisationalUnits.personId, versionId));

			await tx.delete(schema.persons).where(eq(schema.persons.id, versionId));
			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all persons whose name starts with `[e2e-worker-{workerIndex}]` and deletes them. Called
	 * in afterAll to ensure a clean state.
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

	/**
	 * Deletes ALL versions (draft + published) of a person document and the document row itself. Use
	 * this instead of `deletePerson` when the document may have more than one version (e.g. after
	 * publish or edit-after-publish flows).
	 */
	async deletePersonDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx
					.delete(schema.personsToOrganisationalUnits)
					.where(eq(schema.personsToOrganisationalUnits.personId, version.id));
				await tx.delete(schema.persons).where(eq(schema.persons.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	/**
	 * Finds all person documents whose name starts with `[e2e-worker-{workerIndex}]` (across any
	 * version) and deletes all their versions. Safe for lifecycle tests where items may be in
	 * published, draft+published, or published-only state.
	 */
	async cleanupWorkerPersonsLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.persons)
			.innerJoin(schema.entityVersions, eq(schema.persons.id, schema.entityVersions.id))
			.where(sql`${schema.persons.name} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deletePersonDocument(documentId);
		}
	}

	/**
	 * Cascade-deletes a working group and all its related records. Replicates the logic in
	 * `delete-working-group.action.ts`.
	 */
	async deleteWorkingGroup(versionId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const ids = await this.resolveVersion(tx, versionId);
			if (ids == null) {
				return;
			}
			const { documentId } = ids;

			await tx
				.delete(schema.organisationalUnitsRelations)
				.where(
					or(
						eq(schema.organisationalUnitsRelations.unitId, versionId),
						eq(schema.organisationalUnitsRelations.relatedUnitId, versionId),
					),
				);

			await tx
				.delete(schema.organisationalUnits)
				.where(eq(schema.organisationalUnits.id, versionId));

			await this.deleteDocumentVersionTail(tx, versionId, documentId);
		});
	}

	/**
	 * Finds all working groups whose name starts with `[e2e-worker-{workerIndex}]` and deletes them.
	 * Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerWorkingGroups(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.organisationalUnits.id })
			.from(schema.organisationalUnits)
			.innerJoin(
				schema.organisationalUnitTypes,
				eq(schema.organisationalUnits.typeId, schema.organisationalUnitTypes.id),
			)
			.where(
				and(
					sql`${schema.organisationalUnits.name} LIKE ${`${prefix}%`}`,
					eq(schema.organisationalUnitTypes.type, "working_group"),
				),
			);

		for (const item of items) {
			await this.deleteWorkingGroup(item.id);
		}
	}

	/**
	 * Deletes a user. Sessions, password reset sessions, and email verification requests cascade on
	 * user delete.
	 */
	async deleteUser(userId: string): Promise<void> {
		await this.db.delete(schema.users).where(eq(schema.users.id, userId));
	}

	/**
	 * Finds all users whose name starts with `[e2e-worker-{workerIndex}]` and deletes them. Called in
	 * afterAll to ensure a clean state.
	 */
	async cleanupWorkerUsers(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(sql`${schema.users.name} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteUser(item.id);
		}
	}

	/**
	 * Cascade-deletes a service and all its related records. Replicates the logic in
	 * `delete-service.action.ts`.
	 */
	async deleteService(serviceId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(schema.servicesToSocialMedia)
				.where(eq(schema.servicesToSocialMedia.serviceId, serviceId));
			await tx
				.delete(schema.servicesToOrganisationalUnits)
				.where(eq(schema.servicesToOrganisationalUnits.serviceId, serviceId));
			await tx.delete(schema.services).where(eq(schema.services.id, serviceId));
		});
	}

	/**
	 * Finds all services whose name starts with `[e2e-worker-{workerIndex}]` and deletes them. Called
	 * in afterAll to ensure a clean state.
	 */
	async cleanupWorkerServices(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.services.id })
			.from(schema.services)
			.where(sql`${schema.services.name} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteService(item.id);
		}
	}

	/**
	 * Cascade-deletes a social media entry and all its related records. Replicates the logic in
	 * `delete-social-media.action.ts`.
	 */
	async deleteSocialMedia(socialMediaId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			await tx
				.delete(schema.servicesToSocialMedia)
				.where(eq(schema.servicesToSocialMedia.socialMediaId, socialMediaId));
			await tx.delete(schema.socialMedia).where(eq(schema.socialMedia.id, socialMediaId));
		});
	}

	/**
	 * Finds all social media entries whose name starts with `[e2e-worker-{workerIndex}]` and deletes
	 * them. Called in afterAll to ensure a clean state.
	 */
	async cleanupWorkerSocialMedia(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const items = await this.db
			.select({ id: schema.socialMedia.id })
			.from(schema.socialMedia)
			.where(sql`${schema.socialMedia.name} LIKE ${`${prefix}%`}`);

		for (const item of items) {
			await this.deleteSocialMedia(item.id);
		}
	}

	/**
	 * Deletes ALL versions (draft + published) of a news document and the document row itself. Use
	 * this instead of `deleteNewsItem` when the document may have more than one version (e.g. after
	 * publish or edit-after-publish flows).
	 */
	async deleteNewsDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx.delete(schema.news).where(eq(schema.news.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	/**
	 * Finds all news documents whose title starts with `[e2e-worker-{workerIndex}]` (across any
	 * version) and deletes all their versions. Safe for lifecycle tests where items may be in
	 * published, draft+published, or published-only state.
	 */
	async cleanupWorkerNewsLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.news)
			.innerJoin(schema.entityVersions, eq(schema.news.id, schema.entityVersions.id))
			.where(sql`${schema.news.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteNewsDocument(documentId);
		}
	}

	/** Returns the document asset inserted by globalSetup. */
	async getTestDocumentAsset(): Promise<{ id: string; key: string }> {
		const asset = await this.db.query.assets.findFirst({
			where: { key: "documents/e2e-test-document" },
			columns: { id: true, key: true },
		});

		if (asset == null) {
			throw new Error(
				`Test document asset "documents/e2e-test-document" not found — make sure globalSetup ran successfully.`,
			);
		}

		return asset;
	}

	/** Returns the first opportunity source from the database. */
	async getOpportunitySource(): Promise<{ id: string; source: string }> {
		const [source] = await this.db
			.select({ id: schema.opportunitySources.id, source: schema.opportunitySources.source })
			.from(schema.opportunitySources)
			.limit(1);

		if (source == null) {
			throw new Error("No opportunity sources found in the database.");
		}

		return source;
	}

	async deleteProjectDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx
					.delete(schema.projectsToOrganisationalUnits)
					.where(eq(schema.projectsToOrganisationalUnits.projectId, version.id));
				await tx
					.delete(schema.projectsToSocialMedia)
					.where(eq(schema.projectsToSocialMedia.projectId, version.id));
				await tx.delete(schema.projects).where(eq(schema.projects.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerProjectsLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.projects)
			.innerJoin(schema.entityVersions, eq(schema.projects.id, schema.entityVersions.id))
			.where(sql`${schema.projects.name} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteProjectDocument(documentId);
		}
	}

	async deleteEventDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx.delete(schema.events).where(eq(schema.events.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerEventsLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.events)
			.innerJoin(schema.entityVersions, eq(schema.events.id, schema.entityVersions.id))
			.where(sql`${schema.events.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteEventDocument(documentId);
		}
	}

	async deleteSpotlightArticleDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx
					.delete(schema.spotlightArticlesToPersons)
					.where(eq(schema.spotlightArticlesToPersons.spotlightArticleId, version.id));
				await tx
					.delete(schema.spotlightArticles)
					.where(eq(schema.spotlightArticles.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerSpotlightArticlesLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.spotlightArticles)
			.innerJoin(schema.entityVersions, eq(schema.spotlightArticles.id, schema.entityVersions.id))
			.where(sql`${schema.spotlightArticles.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteSpotlightArticleDocument(documentId);
		}
	}

	async deleteImpactCaseStudyDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx
					.delete(schema.impactCaseStudiesToPersons)
					.where(eq(schema.impactCaseStudiesToPersons.impactCaseStudyId, version.id));
				await tx
					.delete(schema.impactCaseStudies)
					.where(eq(schema.impactCaseStudies.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerImpactCaseStudiesLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.impactCaseStudies)
			.innerJoin(schema.entityVersions, eq(schema.impactCaseStudies.id, schema.entityVersions.id))
			.where(sql`${schema.impactCaseStudies.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteImpactCaseStudyDocument(documentId);
		}
	}

	async deletePageDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx.delete(schema.pages).where(eq(schema.pages.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerPageItemsLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.pages)
			.innerJoin(schema.entityVersions, eq(schema.pages.id, schema.entityVersions.id))
			.where(sql`${schema.pages.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deletePageDocument(documentId);
		}
	}

	async deleteDocumentationPageDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx
					.delete(schema.documentationPages)
					.where(eq(schema.documentationPages.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerDocumentationPagesLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.documentationPages)
			.innerJoin(schema.entityVersions, eq(schema.documentationPages.id, schema.entityVersions.id))
			.where(sql`${schema.documentationPages.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteDocumentationPageDocument(documentId);
		}
	}

	async deleteDocumentOrPolicyDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx
					.delete(schema.documentsPolicies)
					.where(eq(schema.documentsPolicies.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerDocumentsPoliciesLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.documentsPolicies)
			.innerJoin(schema.entityVersions, eq(schema.documentsPolicies.id, schema.entityVersions.id))
			.where(sql`${schema.documentsPolicies.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteDocumentOrPolicyDocument(documentId);
		}
	}

	async deleteFundingCallDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx.delete(schema.fundingCalls).where(eq(schema.fundingCalls.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerFundingCallsLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.fundingCalls)
			.innerJoin(schema.entityVersions, eq(schema.fundingCalls.id, schema.entityVersions.id))
			.where(sql`${schema.fundingCalls.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteFundingCallDocument(documentId);
		}
	}

	async deleteOpportunityDocument(documentId: string): Promise<void> {
		await this.db.transaction(async (tx) => {
			const versions = await tx
				.select({ id: schema.entityVersions.id })
				.from(schema.entityVersions)
				.where(eq(schema.entityVersions.entityId, documentId));

			for (const version of versions) {
				const entityFields = await tx
					.select({ id: schema.fields.id })
					.from(schema.fields)
					.where(eq(schema.fields.entityVersionId, version.id));

				if (entityFields.length > 0) {
					const fieldIds = (entityFields as Array<{ id: string }>).map((f) => f.id);
					await tx
						.delete(schema.contentBlocks)
						.where(inArray(schema.contentBlocks.fieldId, fieldIds));
					await tx.delete(schema.fields).where(inArray(schema.fields.id, fieldIds));
				}

				await tx.delete(schema.opportunities).where(eq(schema.opportunities.id, version.id));
				await tx.delete(schema.entityVersions).where(eq(schema.entityVersions.id, version.id));
			}

			await tx
				.delete(schema.entitiesToResources)
				.where(eq(schema.entitiesToResources.entityId, documentId));

			await tx
				.delete(schema.entitiesToEntities)
				.where(
					or(
						eq(schema.entitiesToEntities.entityId, documentId),
						eq(schema.entitiesToEntities.relatedEntityId, documentId),
					),
				);

			await tx.delete(schema.entities).where(eq(schema.entities.id, documentId));
		});
	}

	async cleanupWorkerOpportunitiesLifecycleItems(workerIndex: number): Promise<void> {
		const prefix = `[e2e-worker-${String(workerIndex)}]`;

		const rows = await this.db
			.select({ documentId: schema.entityVersions.entityId })
			.from(schema.opportunities)
			.innerJoin(schema.entityVersions, eq(schema.opportunities.id, schema.entityVersions.id))
			.where(sql`${schema.opportunities.title} LIKE ${`${prefix}%`}`);

		const documentIds = [...new Set(rows.map((r) => r.documentId))];

		for (const documentId of documentIds) {
			await this.deleteOpportunityDocument(documentId);
		}
	}

	/** Closes the underlying pg pool. Called in worker teardown. */
	async close(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		await (this.db as any).$client?.end?.();
	}
}
