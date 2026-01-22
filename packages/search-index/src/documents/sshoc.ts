import { createClient, type Items } from "@acdh-oeaw/api-client-sshoc";
import { createUrl, err, isErr, ok, type Result, unreachable } from "@acdh-oeaw/lib";

import type { ResourceCollectionDocument } from "../schema";

function isConceptProperty(value: Items.Search.Property): value is Items.Search.ConceptProperty {
	return value.type.type === "concept";
}

/**
 * @see {@link https://marketplace-api.sshopencloud.eu/swagger-ui/index.html}
 */
export async function getDocuments(): Promise<Result<Array<ResourceCollectionDocument>, Error>> {
	const client = createClient({ baseUrl: "https://marketplace-api.sshopencloud.eu" });

	const documents: Array<ResourceCollectionDocument> = [];

	const request = client.items.search({
		"f.keyword": ["DARIAH Resource"],
		categories: ["tool-or-service", "training-material", "workflow"],
		perpage: 100,
	});

	let page = 1;
	let pages = 0;

	do {
		request.url.searchParams.set("page", String(page));

		const response = await request.request();

		if (isErr(response)) {
			return err(new Error("Failed to fetch data.", { cause: response.error }));
		}

		const data = response.value.data;

		pages = data.pages;

		documents.push(
			...data.items.map<ResourceCollectionDocument>((item) => {
				const keywords = [];

				for (const property of item.properties) {
					if (
						isConceptProperty(property) &&
						property.type.code === "keyword" &&
						property.concept.label !== "DARIAH Resource"
					) {
						keywords.push(property.concept.label);
					}
				}

				const links = [
					String(
						createUrl({
							baseUrl: "https://marketplace.sshopencloud.eu",
							pathname: `/${item.category}/${item.persistentId}`,
						}),
					),
				];

				for (const link of item.accessibleAt) {
					links.push(link);
				}

				const source = "ssh-open-marketplace";
				const sourceId = item.persistentId;
				const id = [source, sourceId].join(":");

				const sourceActorIds = item.contributors.flatMap((contributor) => {
					return contributor.actor.id;
				});
				const actorIds = sourceActorIds.map((sourceActorId) => {
					return [source, sourceActorId].join(":");
				});

				const document = {
					id,
					source,
					source_id: sourceId,
					imported_at: Date.now(),
					label: item.label,
					description: item.description,
					keywords,
					links,
					actor_ids: actorIds,
				} satisfies Partial<ResourceCollectionDocument>;

				switch (item.category) {
					case "tool-or-service": {
						const isCoreService = item.properties.some((property) => {
							return (
								isConceptProperty(property) &&
								property.type.code === "keyword" &&
								property.concept.label === "DARIAH Core Service"
							);
						});

						return {
							...document,
							type: "tool-or-service",
							kind: isCoreService ? "core" : "community",
						};
					}

					case "training-material": {
						return {
							...document,
							type: "training-material",
						};
					}

					case "workflow": {
						return {
							...document,
							type: "workflow",
						};
					}

					case "dataset":
					case "publication": {
						unreachable();
					}
				}
			}),
		);
	} while (page++ <= pages);

	return ok(documents);
}
