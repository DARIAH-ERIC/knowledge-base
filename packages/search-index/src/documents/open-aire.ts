import { createUrl, createUrlSearchParams, err, isErr, ok, type Result } from "@acdh-oeaw/lib";

import type { CollectionDocument } from "../schema";
import { request } from "../utils/request";

interface Response {
	header: {
		numFound: number;
		maxScore: number;
		queryTime: number;
		pageSize: number;
		nextCursor: string | undefined;
	};
	results: Array<{
		authors: Array<{
			fullName: string;
			name: null | string;
			surname: null | string;
			rank: number;
			pid: {
				id: {
					scheme: string;
					value: string;
				};
				provenance: null;
			} | null;
		}>;
		openAccessColor: null;
		publiclyFunded: null;
		type: "dataset";
		language: {
			code: string;
			label: string;
		};
		countries: null;
		subjects: Array<{
			subject: {
				scheme: string;
				value: string;
			};
			provenance: null;
		}> | null;
		mainTitle: string;
		subTitle: null;
		descriptions: Array<string> | null;
		publicationDate: Date;
		publisher: string;
		embargoEndDate: null;
		sources: null;
		formats: null;
		contributors: null;
		coverages: null;
		bestAccessRight: null;
		container: null;
		documentationUrls: null;
		codeRepositoryUrl: null;
		programmingLanguage: null;
		contactPeople: null;
		contactGroups: null;
		tools: null;
		size: null;
		version: null;
		geoLocations: null;
		id: string;
		originalIds: Array<string>;
		pids: Array<{
			scheme: string;
			value: string;
		}>;
		dateOfCollection: null;
		lastUpdateTimeStamp: null;
		indicators: {
			citationImpact: {
				citationCount: number;
				influence: number;
				popularity: number;
				impulse: number;
				citationClass: string;
				influenceClass: string;
				impulseClass: string;
				popularityClass: string;
			};
		};
		projects: null;
		organizations: Array<unknown> | null;
		communities: Array<unknown> | null;
		collectedFrom: Array<{
			key: string;
			value: string;
		}>;
		instances: Array<{
			pids: Array<unknown>;
			type: "dataset";
			urls: Array<string>;
			publicationDate: Date;
			refereed: string;
			hostedBy: {
				key: string;
				value: string;
			};
			collectedFrom: {
				key: string;
				value: string;
			};
			license?: string;
		}>;
		isGreen: null;
		isInDiamondJournal: null;
	}>;
}

/**
 * @see {@link https://api.openaire.eu/graph/swagger-ui/index.html}
 */
export async function getDocuments(): Promise<Result<Array<CollectionDocument>, Error>> {
	const documents: Array<CollectionDocument> = [];

	const headers = {
		Accept: "application/json",
	};

	const url = createUrl({
		baseUrl: "https://api.openaire.eu",
		pathname: "/graph/v2/researchProducts",
		searchParams: createUrlSearchParams({
			relCommunityId: "dariah",
			type: "publication",
			pageSize: 100,
		}),
	});

	let cursor: string | undefined = "*";

	do {
		url.searchParams.set("cursor", cursor);

		const response = await request(url, { headers, responseType: "json" });

		if (isErr(response)) {
			return err(new Error("Failed to fetch data.", { cause: response.error }));
		}

		const data = response.value.data as Response;

		cursor = data.header.nextCursor;

		documents.push(
			...data.results.map((item) => {
				const keywords = [];

				if (item.subjects != null) {
					for (const subject of item.subjects) {
						if (subject.subject.scheme === "keyword") {
							keywords.push(subject.subject.value);
						}
					}
				}

				const source = "open-aire";
				const sourceId = item.id;
				const id = [source, sourceId].join(":");

				const document: CollectionDocument = {
					id,
					source,
					source_id: sourceId,
					imported_at: Date.now(),
					kind: "publication",
					label: item.mainTitle,
					description: item.descriptions?.join("\n") ?? "",
					links: [],
					keywords,
					type: null,
					authors: [],
					year: null,
					pid: null,
				};

				return document;
			}),
		);
	} while (cursor != null);

	return ok(documents);
}
