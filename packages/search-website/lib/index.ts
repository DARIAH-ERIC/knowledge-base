import type { Database } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { alias, and, eq, inArray, sql } from "@dariah-eric/database/sql";
import type { WebsiteDocument } from "@dariah-eric/search";
import type { SearchAdminService } from "@dariah-eric/search/admin";

export type SupportedWebsiteEntityType =
	| "country"
	| "document-or-policy"
	| "event"
	| "funding-call"
	| "impact-case-study"
	| "news-item"
	| "opportunity"
	| "page"
	| "person"
	| "project"
	| "spotlight-article"
	| "working-group";

export interface WebsiteDocumentDescriptor {
	slug: string;
	type: SupportedWebsiteEntityType;
}

export interface SyncWebsiteDocumentResult {
	entityId?: string;
	documentId?: string;
	error?: unknown;
	ok: boolean;
	operation: "deleted" | "skipped" | "upserted";
}

export interface CreateWebsiteSearchIndexServiceParams {
	db: Database;
	search: SearchAdminService;
}

export interface SyncWebsiteSearchIndexResult {
	count: number;
}

type CanonicalWebsiteEntityType =
	| "country"
	| "document-or-policy"
	| "event"
	| "funding-call"
	| "impact-case-study"
	| "institution"
	| "national-consortium"
	| "news-item"
	| "opportunity"
	| "page"
	| "person"
	| "project"
	| "spotlight-article"
	| "working-group";

export const supportedWebsiteEntityTypes = [
	"country",
	"document-or-policy",
	"event",
	"funding-call",
	"impact-case-study",
	"news-item",
	"opportunity",
	"page",
	"person",
	"project",
	"spotlight-article",
	"working-group",
] as const satisfies Array<SupportedWebsiteEntityType>;

function createWebsiteDocumentId(descriptor: WebsiteDocumentDescriptor): string {
	return [descriptor.type, descriptor.slug].join(":");
}

function createWebsiteEntityDocument(params: {
	description: string;
	documentId?: string;
	importedAt: number;
	label: string;
	link: string;
	sourceId: string;
	sourceUpdatedAt: Date;
	type: CanonicalWebsiteEntityType;
}): WebsiteDocument {
	const {
		description,
		importedAt,
		label,
		link,
		sourceId,
		documentId = sourceId,
		sourceUpdatedAt,
		type,
	} = params;

	return {
		kind: "entity",
		source: "dariah-knowledge-base",
		source_id: sourceId,
		source_updated_at: sourceUpdatedAt.getTime(),
		imported_at: importedAt,
		type,
		id: [type, documentId].join(":"),
		label,
		description,
		link,
	};
}

function isMissingSearchDocumentError(error: unknown): boolean {
	if (typeof error !== "object" || error == null) {
		return false;
	}

	const cause = "cause" in error ? error.cause : undefined;

	if (typeof cause !== "object" || cause == null) {
		return false;
	}

	if ("httpStatus" in cause && cause.httpStatus === 404) {
		return true;
	}

	if ("message" in cause && typeof cause.message === "string") {
		return cause.message.includes("Not Found") || cause.message.includes("Could not find");
	}

	return false;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createWebsiteSearchIndexService(params: CreateWebsiteSearchIndexServiceParams) {
	const { db, search } = params;

	async function getWebsiteDocumentDescriptorByEntityId(
		entityId: string,
	): Promise<WebsiteDocumentDescriptor | null> {
		const entity = await db.query.entities.findFirst({
			where: {
				id: entityId,
			},
			columns: {
				slug: true,
			},
			with: {
				type: {
					columns: {
						type: true,
					},
				},
			},
		});

		if (entity == null) {
			return null;
		}

		switch (entity.type.type) {
			case "documents_policies": {
				return { slug: entity.slug, type: "document-or-policy" };
			}
			case "events": {
				return { slug: entity.slug, type: "event" };
			}
			case "funding_calls": {
				return { slug: entity.slug, type: "funding-call" };
			}
			case "impact_case_studies": {
				return { slug: entity.slug, type: "impact-case-study" };
			}
			case "news": {
				return { slug: entity.slug, type: "news-item" };
			}
			case "opportunities": {
				return { slug: entity.slug, type: "opportunity" };
			}
			case "pages": {
				return { slug: entity.slug, type: "page" };
			}
			case "persons": {
				return { slug: entity.slug, type: "person" };
			}
			case "projects": {
				return { slug: entity.slug, type: "project" };
			}
			case "spotlight_articles": {
				return { slug: entity.slug, type: "spotlight-article" };
			}
			case "organisational_units": {
				const [country, workingGroup] = await Promise.all([
					db.query.membersAndPartners.findFirst({
						where: {
							id: entityId,
						},
						columns: {
							id: true,
						},
					}),
					db.query.workingGroups.findFirst({
						where: {
							id: entityId,
						},
						columns: {
							id: true,
						},
					}),
				]);

				if (country != null) {
					return { slug: entity.slug, type: "country" };
				}

				if (workingGroup != null) {
					return { slug: entity.slug, type: "working-group" };
				}

				return null;
			}
			case "external_links": {
				return null;
			}
		}
	}

	async function getSyncableWebsiteEntityIds(): Promise<Array<string>> {
		return getSyncableWebsiteEntityIdsByType();
	}

	async function getSyncableWebsiteEntityIdsByType(
		entityType?: SupportedWebsiteEntityType,
	): Promise<Array<string>> {
		switch (entityType) {
			case "country": {
				const items = await db.query.membersAndPartners.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "document-or-policy": {
				const items = await db.query.documentsPolicies.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "event": {
				const items = await db.query.events.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "funding-call": {
				const items = await db.query.fundingCalls.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "impact-case-study": {
				const items = await db.query.impactCaseStudies.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "news-item": {
				const items = await db.query.news.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "opportunity": {
				const items = await db.query.opportunities.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "page": {
				const items = await db.query.pages.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "person": {
				const items = await db.query.persons.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "project": {
				const items = await db.query.dariahProjects.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "spotlight-article": {
				const items = await db.query.spotlightArticles.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case "working-group": {
				const items = await db.query.workingGroups.findMany({
					columns: { id: true },
					where: {
						entity: {
							status: {
								type: "published",
							},
						},
					},
				});

				return items.map((item) => {
					return item.id;
				});
			}

			case undefined: {
				const groups = await Promise.all(
					supportedWebsiteEntityTypes.map((type) => {
						return getSyncableWebsiteEntityIdsByType(type);
					}),
				);

				return groups.flat();
			}
		}
	}

	async function getWebsiteDocumentForEntity(
		entityId: string,
		params?: { importedAt?: number },
	): Promise<WebsiteDocument | null> {
		const importedAt = params?.importedAt ?? Date.now();
		const descriptor = await getWebsiteDocumentDescriptorByEntityId(entityId);

		if (descriptor == null) {
			return null;
		}

		switch (descriptor.type) {
			case "country": {
				const item = await db.query.membersAndPartners.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						name: true,
						summary: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "country",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: item.summary ?? "",
					link: `/network/members-and-partners/${item.entity.slug}`,
				});
			}

			case "document-or-policy": {
				const item = await db.query.documentsPolicies.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "document-or-policy",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: "/about/documents",
				});
			}

			case "event": {
				const item = await db.query.events.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "event",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/events/${item.entity.slug}`,
				});
			}

			case "funding-call": {
				const item = await db.query.fundingCalls.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "funding-call",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary ?? "",
					link: `/funding-calls/${item.entity.slug}`,
				});
			}

			case "impact-case-study": {
				const item = await db.query.impactCaseStudies.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "impact-case-study",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/about/impact-case-studies/${item.entity.slug}`,
				});
			}

			case "news-item": {
				const item = await db.query.news.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "news-item",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/news/${item.entity.slug}`,
				});
			}

			case "opportunity": {
				const item = await db.query.opportunities.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "opportunity",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary ?? "",
					link: `/opportunities/${item.entity.slug}`,
				});
			}

			case "page": {
				const item = await db.query.pages.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "page",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/${item.entity.slug}`,
				});
			}

			case "person": {
				const item = await db.query.persons.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						name: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "person",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: "",
					link: `/persons/${item.entity.slug}`,
				});
			}

			case "project": {
				const item = await db.query.dariahProjects.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						name: true,
						summary: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "project",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: item.summary,
					link: `/projects/${item.entity.slug}`,
				});
			}

			case "spotlight-article": {
				const item = await db.query.spotlightArticles.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						summary: true,
						title: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "spotlight-article",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/spotlights/${item.entity.slug}`,
				});
			}

			case "working-group": {
				const item = await db.query.workingGroups.findFirst({
					where: {
						id: entityId,
						entity: {
							status: {
								type: "published",
							},
						},
					},
					columns: {
						name: true,
						summary: true,
						updatedAt: true,
					},
					with: {
						entity: {
							columns: {
								slug: true,
							},
						},
					},
				});

				if (item == null) {
					return null;
				}

				return createWebsiteEntityDocument({
					importedAt,
					type: "working-group",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: item.summary ?? "",
					link: `/network/working-groups/${item.entity.slug}`,
				});
			}
		}
	}

	async function createWebsiteEntityDocuments(params?: {
		importedAt?: number;
	}): Promise<Array<WebsiteDocument>> {
		const importedAt = params?.importedAt ?? Date.now();
		const website: Array<WebsiteDocument> = [];

		const documentsPolicies = await db.query.documentsPolicies.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...documentsPolicies.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "document-or-policy",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: "/about/documents",
				});
			}),
		);

		const events = await db.query.events.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...events.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "event",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/events/${item.entity.slug}`,
				});
			}),
		);

		const fundingCalls = await db.query.fundingCalls.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...fundingCalls.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "funding-call",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary ?? "",
					link: `/funding-calls/${item.entity.slug}`,
				});
			}),
		);

		const impactCaseStudies = await db.query.impactCaseStudies.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...impactCaseStudies.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "impact-case-study",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/about/impact-case-studies/${item.entity.slug}`,
				});
			}),
		);

		const membersAndPartners = await db.query.membersAndPartners.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...membersAndPartners.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "country",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: item.summary ?? "",
					link: `/network/members-and-partners/${item.entity.slug}`,
				});
			}),
		);

		const countryEntities = alias(schema.entities, "country_entities");
		const itemEntities = alias(schema.entities, "item_entities");
		const organisationalRelationStatus = alias(
			schema.organisationalUnitStatus,
			"organisational_relation_status",
		);
		const organisationalUnitType = alias(
			schema.organisationalUnitTypes,
			"organisational_unit_type",
		);
		const publishedEntityStatus = alias(schema.entityStatus, "published_entity_status");

		const nationalConsortia = await db
			.select({
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.organisationalUnits.name,
				description: schema.organisationalUnits.summary,
				sourceUpdatedAt: schema.organisationalUnits.updatedAt,
			})
			.from(schema.organisationalUnits)
			.innerJoin(itemEntities, eq(schema.organisationalUnits.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				organisationalUnitType,
				eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
			)
			.innerJoin(
				schema.organisationalUnitsRelations,
				eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				organisationalRelationStatus,
				eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					eq(organisationalUnitType.type, "national_consortium"),
					eq(organisationalRelationStatus.status, "is_national_consortium_of"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
				),
			);

		website.push(
			...nationalConsortia.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "national-consortium",
					sourceId: item.itemSlug,
					documentId: `${item.countrySlug}:${item.itemSlug}`,
					sourceUpdatedAt: item.sourceUpdatedAt,
					label: item.label,
					description: item.description ?? "",
					link: `/network/members-and-partners/${item.countrySlug}`,
				});
			}),
		);

		const partnerInstitutions = await db
			.select({
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.organisationalUnits.name,
				description: schema.organisationalUnits.summary,
				sourceUpdatedAt: schema.organisationalUnits.updatedAt,
			})
			.from(schema.organisationalUnits)
			.innerJoin(itemEntities, eq(schema.organisationalUnits.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				organisationalUnitType,
				eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
			)
			.innerJoin(
				schema.organisationalUnitsRelations,
				eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				organisationalRelationStatus,
				eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					eq(organisationalUnitType.type, "institution"),
					eq(organisationalRelationStatus.status, "is_located_in"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
					sql`
						EXISTS (
							SELECT
								1
							FROM
								${schema.organisationalUnitsRelations} partner_relations
								INNER JOIN ${schema.organisationalUnitStatus} partner_relation_status ON partner_relations.status = partner_relation_status.id
								INNER JOIN ${schema.organisationalUnits} related_units ON partner_relations.related_unit_id = related_units.id
								INNER JOIN ${schema.organisationalUnitTypes} related_unit_types ON related_units.type_id = related_unit_types.id
							WHERE
								partner_relations.unit_id = ${schema.organisationalUnits.id}
								AND partner_relation_status.status = 'is_partner_institution_of'
								AND related_unit_types.type = 'eric'
								AND partner_relations.duration @> NOW()::TIMESTAMPTZ
						)
					`,
				),
			);

		website.push(
			...partnerInstitutions.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "institution",
					sourceId: item.itemSlug,
					documentId: `${item.countrySlug}:${item.itemSlug}`,
					sourceUpdatedAt: item.sourceUpdatedAt,
					label: item.label,
					description: item.description ?? "",
					link: `/network/members-and-partners/${item.countrySlug}`,
				});
			}),
		);

		const cooperatingPartnerInstitutions = await db
			.select({
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.organisationalUnits.name,
				description: schema.organisationalUnits.summary,
				sourceUpdatedAt: schema.organisationalUnits.updatedAt,
			})
			.from(schema.organisationalUnits)
			.innerJoin(itemEntities, eq(schema.organisationalUnits.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				organisationalUnitType,
				eq(schema.organisationalUnits.typeId, organisationalUnitType.id),
			)
			.innerJoin(
				schema.organisationalUnitsRelations,
				eq(schema.organisationalUnitsRelations.unitId, schema.organisationalUnits.id),
			)
			.innerJoin(
				organisationalRelationStatus,
				eq(schema.organisationalUnitsRelations.status, organisationalRelationStatus.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.organisationalUnitsRelations.relatedUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					eq(organisationalUnitType.type, "institution"),
					eq(organisationalRelationStatus.status, "is_located_in"),
					sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
					sql`
						EXISTS (
							SELECT
								1
							FROM
								${schema.organisationalUnitsRelations} cooperating_relations
								INNER JOIN ${schema.organisationalUnitStatus} cooperating_relation_status ON cooperating_relations.status = cooperating_relation_status.id
								INNER JOIN ${schema.organisationalUnits} related_units ON cooperating_relations.related_unit_id = related_units.id
								INNER JOIN ${schema.organisationalUnitTypes} related_unit_types ON related_units.type_id = related_unit_types.id
							WHERE
								cooperating_relations.unit_id = ${schema.organisationalUnits.id}
								AND cooperating_relation_status.status = 'is_cooperating_partner_of'
								AND related_unit_types.type = 'eric'
								AND cooperating_relations.duration @> NOW()::TIMESTAMPTZ
						)
					`,
				),
			);

		website.push(
			...cooperatingPartnerInstitutions.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "institution",
					sourceId: item.itemSlug,
					documentId: `${item.countrySlug}:${item.itemSlug}`,
					sourceUpdatedAt: item.sourceUpdatedAt,
					label: item.label,
					description: item.description ?? "",
					link: `/network/members-and-partners/${item.countrySlug}`,
				});
			}),
		);

		const personRoleType = alias(schema.personRoleTypes, "person_role_type");

		const countryContributors = await db
			.select({
				countrySlug: countryEntities.slug,
				itemSlug: itemEntities.slug,
				label: schema.persons.name,
				sourceUpdatedAt: schema.persons.updatedAt,
			})
			.from(schema.personsToOrganisationalUnits)
			.innerJoin(
				schema.persons,
				eq(schema.personsToOrganisationalUnits.personId, schema.persons.id),
			)
			.innerJoin(itemEntities, eq(schema.persons.id, itemEntities.id))
			.innerJoin(publishedEntityStatus, eq(itemEntities.statusId, publishedEntityStatus.id))
			.innerJoin(
				personRoleType,
				eq(schema.personsToOrganisationalUnits.roleTypeId, personRoleType.id),
			)
			.innerJoin(
				schema.membersAndPartners,
				eq(schema.personsToOrganisationalUnits.organisationalUnitId, schema.membersAndPartners.id),
			)
			.innerJoin(countryEntities, eq(schema.membersAndPartners.id, countryEntities.id))
			.where(
				and(
					eq(publishedEntityStatus.type, "published"),
					inArray(personRoleType.type, [
						"national_coordinator",
						"national_coordinator_deputy",
						"national_representative",
						"national_representative_deputy",
					]),
					sql`${schema.personsToOrganisationalUnits.duration} @> NOW()::TIMESTAMPTZ`,
				),
			);

		const contributorDocumentsById = new Map<string, WebsiteDocument>();

		for (const item of countryContributors) {
			contributorDocumentsById.set(`${item.countrySlug}:${item.itemSlug}`, {
				kind: "entity",
				source: "dariah-knowledge-base",
				source_id: item.itemSlug,
				source_updated_at: item.sourceUpdatedAt.getTime(),
				imported_at: importedAt,
				type: "person",
				id: ["person", `${item.countrySlug}:${item.itemSlug}`].join(":"),
				label: item.label,
				description: "",
				link: `/network/members-and-partners/${item.countrySlug}`,
			});
		}

		website.push(...contributorDocumentsById.values());

		const news = await db.query.news.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...news.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "news-item",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/news/${item.entity.slug}`,
				});
			}),
		);

		const opportunities = await db.query.opportunities.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...opportunities.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "opportunity",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary ?? "",
					link: `/opportunities/${item.entity.slug}`,
				});
			}),
		);

		const pages = await db.query.pages.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...pages.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "page",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/${item.entity.slug}`,
				});
			}),
		);

		const persons = await db.query.persons.findMany({
			columns: {
				id: true,
				name: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...persons.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "person",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: "",
					link: `/persons/${item.entity.slug}`,
				});
			}),
		);

		const dariahProjects = await db.query.dariahProjects.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...dariahProjects.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "project",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: item.summary,
					link: `/projects/${item.entity.slug}`,
				});
			}),
		);

		const spotlightArticles = await db.query.spotlightArticles.findMany({
			columns: {
				id: true,
				summary: true,
				title: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...spotlightArticles.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "spotlight-article",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.title,
					description: item.summary,
					link: `/spotlights/${item.entity.slug}`,
				});
			}),
		);

		const workingGroups = await db.query.workingGroups.findMany({
			columns: {
				id: true,
				name: true,
				summary: true,
				updatedAt: true,
			},
			where: {
				entity: {
					status: {
						type: "published",
					},
				},
			},
			with: {
				entity: {
					columns: {
						slug: true,
					},
				},
			},
		});

		website.push(
			...workingGroups.map((item) => {
				return createWebsiteEntityDocument({
					importedAt,
					type: "working-group",
					sourceId: item.entity.slug,
					sourceUpdatedAt: item.updatedAt,
					label: item.name,
					description: item.summary ?? "",
					link: `/network/working-groups/${item.entity.slug}`,
				});
			}),
		);

		return website;
	}

	async function syncWebsiteSearchIndex(): Promise<SyncWebsiteSearchIndexResult> {
		const documents = await createWebsiteEntityDocuments();
		const result = await search.collections.website.ingest(documents);

		if (result.isErr()) {
			throw result.error;
		}

		return {
			count: documents.length,
		};
	}

	async function deleteWebsiteDocument(
		descriptor: WebsiteDocumentDescriptor,
	): Promise<SyncWebsiteDocumentResult> {
		const documentId = createWebsiteDocumentId(descriptor);
		const result = await search.collections.website.delete(documentId);

		if (result.isErr() && !isMissingSearchDocumentError(result.error)) {
			console.error("Failed to delete website search document.", {
				documentId,
				error: result.error,
			});

			return {
				documentId,
				error: result.error,
				ok: false,
				operation: "deleted",
			};
		}

		return {
			documentId,
			ok: true,
			operation: "deleted",
		};
	}

	async function syncWebsiteDocumentForEntity(entityId: string): Promise<void> {
		await syncWebsiteDocumentForEntityWithResult(entityId);
	}

	async function syncWebsiteDocumentForEntityWithResult(
		entityId: string,
	): Promise<SyncWebsiteDocumentResult> {
		const descriptor = await getWebsiteDocumentDescriptorByEntityId(entityId);

		if (descriptor == null) {
			return { entityId, ok: true, operation: "skipped" };
		}

		const document = await getWebsiteDocumentForEntity(entityId);

		if (document == null) {
			const result = await deleteWebsiteDocument(descriptor);

			return { ...result, entityId };
		}

		const result = await search.collections.website.upsert(document);

		if (result.isErr()) {
			console.error("Failed to upsert website search document.", {
				entityId,
				documentId: document.id,
				error: result.error,
			});

			return {
				entityId,
				documentId: document.id,
				error: result.error,
				ok: false,
				operation: "upserted",
			};
		}

		return {
			entityId,
			documentId: document.id,
			ok: true,
			operation: "upserted",
		};
	}

	return {
		createWebsiteEntityDocuments,
		deleteWebsiteDocument,
		getSyncableWebsiteEntityIds,
		getSyncableWebsiteEntityIdsByType,
		getWebsiteDocumentDescriptorByEntityId,
		getWebsiteDocumentForEntity,
		supportedWebsiteEntityTypes,
		syncWebsiteDocumentForEntity,
		syncWebsiteDocumentForEntityWithResult,
		syncWebsiteSearchIndex,
	};
}
