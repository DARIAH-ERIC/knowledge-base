import {
	createUrl,
	createUrlSearchParams,
	err,
	isErr,
	ok,
	request,
	type Result,
} from "@acdh-oeaw/lib";

import type { ResourceCollectionDocument } from "../schema";
import { parseLinkHeader } from "../utils/parse-link-header";

type Response = Array<{
	key: string;
	version: number;
	library: {
		type: "group";
		id: number;
		name: string;
		links: {
			alternate: {
				href: string;
				type: "text/html";
			};
		};
	};
	links: {
		self: { href: string; type: "application/json" };
		alternate: { href: string; type: "text/html" };
	};
	meta: {
		parsedDate: string;
	};
	data: {
		key: string;
		version: number;
		itemType: string;
		title: string;
		creators: Array<{
			creatorType: "author";
			firstName: string;
			lastName: string;
		}>;
		abstractNote: string | null;
		language: string;
		tags: Array<{
			tag: string;
		}>;
		DOI: string | null;
	};
}>;

/**
 * @see {@link https://www.zotero.org/support/dev/web_api/v3/start}
 */
export async function getDocuments(): Promise<Result<Array<ResourceCollectionDocument>, Error>> {
	const documents: Array<ResourceCollectionDocument> = [];

	const headers = {
		Accept: "application/json",
		"Zotero-API-Version": "3",
	};

	const groupId = 744_474;

	let url: URL | undefined = createUrl({
		baseUrl: "https://api.zotero.org",
		pathname: `/groups/${String(groupId)}/items`,
		searchParams: createUrlSearchParams({
			/** @see {@link https://api.zotero.org/itemTypes} */
			itemType: "book || bookSection || conferencePaper || journalArticle",
			limit: 50,
		}),
	});

	do {
		const response = await request(url, { headers, responseType: "json" });

		if (isErr(response)) {
			return err(new Error("Failed to fetch data.", { cause: response.error }));
		}

		const data = response.value.data as Response;

		documents.push(
			...data.map((item) => {
				const authors = [];

				for (const creator of item.data.creators) {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
					if (creator.creatorType === "author") {
						authors.push([creator.firstName, creator.lastName].join(" "));
					}
				}

				const year = new Date(item.meta.parsedDate).getUTCFullYear();

				const source = "zotero";
				const sourceId = item.key;
				const id = [source, sourceId].join(":");

				const document: ResourceCollectionDocument = {
					id,
					source,
					source_id: sourceId,
					imported_at: Date.now(),
					type: "publication",
					label: item.data.title,
					description: item.data.abstractNote ?? "",
					links: [item.links.alternate.href],
					keywords: item.data.tags.map((tag) => {
						return tag.tag;
					}),
					kind: item.data.itemType,
					authors,
					year,
					pid: item.data.DOI,
				};

				return document;
			}),
		);

		/**
		 * Zotero returns pagination information in link header.
		 *
		 * @see https://www.zotero.org/support/dev/web_api/v3/basics#sorting_and_pagination
		 */
		const links = parseLinkHeader(response.value.headers.get("link"));

		url = "next" in links ? new URL(links.next) : undefined;
	} while (url != null);

	return ok(documents);
}
