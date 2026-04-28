import type { WebsiteDocument } from "@dariah-eric/search";

import { db } from "@/lib/db";
import { search } from "@/lib/search/admin";

type SupportedEntityType =
	| "document-or-policy"
	| "event"
	| "impact-case-study"
	| "news-item"
	| "page"
	| "spotlight-article";

interface WebsiteDocumentDescriptor {
	slug: string;
	type: SupportedEntityType;
}

function createWebsiteDocumentId(descriptor: WebsiteDocumentDescriptor): string {
	return [descriptor.type, descriptor.slug].join(":");
}

function getWebsiteDocumentDescriptor(params: {
	entityType: string;
	slug: string;
}): WebsiteDocumentDescriptor | null {
	const { entityType, slug } = params;

	switch (entityType) {
		case "documents_policies": {
			return { type: "document-or-policy", slug };
		}

		case "events": {
			return { type: "event", slug };
		}

		case "impact_case_studies": {
			return { type: "impact-case-study", slug };
		}

		case "news": {
			return { type: "news-item", slug };
		}

		case "pages": {
			return { type: "page", slug };
		}

		case "spotlight_articles": {
			return { type: "spotlight-article", slug };
		}

		default: {
			return null;
		}
	}
}

function createWebsiteDocument(params: {
	description: string;
	label: string;
	link: string;
	sourceUpdatedAt: Date;
	descriptor: WebsiteDocumentDescriptor;
}): WebsiteDocument {
	const { description, descriptor, label, link, sourceUpdatedAt } = params;

	return {
		kind: "entity",
		source: "dariah-knowledge-base",
		source_id: descriptor.slug,
		source_updated_at: sourceUpdatedAt.getTime(),
		imported_at: Date.now(),
		type: descriptor.type,
		id: createWebsiteDocumentId(descriptor),
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

export async function getWebsiteDocumentDescriptorByEntityId(
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

	return getWebsiteDocumentDescriptor({
		entityType: entity.type.type,
		slug: entity.slug,
	});
}

export async function getWebsiteDocumentForEntity(entityId: string): Promise<WebsiteDocument | null> {
	const entity = await db.query.entities.findFirst({
		where: {
			id: entityId,
		},
		columns: {
			slug: true,
		},
		with: {
			status: {
				columns: {
					type: true,
				},
			},
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

	const descriptor = getWebsiteDocumentDescriptor({
		entityType: entity.type.type,
		slug: entity.slug,
	});

	if (descriptor == null || entity.status.type !== "published") {
		return null;
	}

	switch (descriptor.type) {
		case "document-or-policy": {
			const item = await db.query.documentsPolicies.findFirst({
				where: {
					id: entityId,
				},
				columns: {
					summary: true,
					title: true,
					updatedAt: true,
				},
			});

			if (item == null) {
				return null;
			}

			return createWebsiteDocument({
				descriptor,
				label: item.title,
				description: item.summary,
				link: "/about/documents",
				sourceUpdatedAt: item.updatedAt,
			});
		}

		case "event": {
			const item = await db.query.events.findFirst({
				where: {
					id: entityId,
				},
				columns: {
					summary: true,
					title: true,
					updatedAt: true,
				},
			});

			if (item == null) {
				return null;
			}

			return createWebsiteDocument({
				descriptor,
				label: item.title,
				description: item.summary,
				link: `/events/${descriptor.slug}`,
				sourceUpdatedAt: item.updatedAt,
			});
		}

		case "impact-case-study": {
			const item = await db.query.impactCaseStudies.findFirst({
				where: {
					id: entityId,
				},
				columns: {
					summary: true,
					title: true,
					updatedAt: true,
				},
			});

			if (item == null) {
				return null;
			}

			return createWebsiteDocument({
				descriptor,
				label: item.title,
				description: item.summary,
				link: `/about/impact-case-studies/${descriptor.slug}`,
				sourceUpdatedAt: item.updatedAt,
			});
		}

		case "news-item": {
			const item = await db.query.news.findFirst({
				where: {
					id: entityId,
				},
				columns: {
					summary: true,
					title: true,
					updatedAt: true,
				},
			});

			if (item == null) {
				return null;
			}

			return createWebsiteDocument({
				descriptor,
				label: item.title,
				description: item.summary,
				link: `/news/${descriptor.slug}`,
				sourceUpdatedAt: item.updatedAt,
			});
		}

		case "page": {
			const item = await db.query.pages.findFirst({
				where: {
					id: entityId,
				},
				columns: {
					summary: true,
					title: true,
					updatedAt: true,
				},
			});

			if (item == null) {
				return null;
			}

			return createWebsiteDocument({
				descriptor,
				label: item.title,
				description: item.summary,
				link: `/${descriptor.slug}`,
				sourceUpdatedAt: item.updatedAt,
			});
		}

		case "spotlight-article": {
			const item = await db.query.spotlightArticles.findFirst({
				where: {
					id: entityId,
				},
				columns: {
					summary: true,
					title: true,
					updatedAt: true,
				},
			});

			if (item == null) {
				return null;
			}

			return createWebsiteDocument({
				descriptor,
				label: item.title,
				description: item.summary,
				link: `/spotlights/${descriptor.slug}`,
				sourceUpdatedAt: item.updatedAt,
			});
		}
	}
}

export async function syncWebsiteDocumentForEntity(entityId: string): Promise<void> {
	const descriptor = await getWebsiteDocumentDescriptorByEntityId(entityId);

	if (descriptor == null) {
		return;
	}

	const document = await getWebsiteDocumentForEntity(entityId);

	if (document == null) {
		await deleteWebsiteDocument(descriptor);
		return;
	}

	const result = await search.collections.website.upsert(document);

	if (result.isErr()) {
		console.error("Failed to upsert website search document.", {
			entityId,
			documentId: document.id,
			error: result.error,
		});
	}
}

export async function deleteWebsiteDocument(descriptor: WebsiteDocumentDescriptor): Promise<void> {
	const result = await search.collections.website.delete(createWebsiteDocumentId(descriptor));

	if (result.isErr() && !isMissingSearchDocumentError(result.error)) {
		console.error("Failed to delete website search document.", {
			documentId: createWebsiteDocumentId(descriptor),
			error: result.error,
		});
	}
}
