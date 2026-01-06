import { err, isErr, log, ok, type Result } from "@acdh-oeaw/lib";

import { getDocuments as getOpenAireDocuments } from "./documents/open-aire";
import { getDocuments as getSshOpenMarketplaceDocuments } from "./documents/sshoc";
import { getDocuments as getZoteroDocuments } from "./documents/zotero";
import type { ResourceCollectionDocument } from "./schema";

const formatters = {
	duration(ms: number) {
		const value = Math.abs(ms);
		return new Intl.DurationFormat("en-GB").format({
			hours: Math.floor(value / 3_600_000),
			minutes: Math.floor((value % 3_600_000) / 60_000),
			seconds: Math.floor((value % 60_000) / 1000),
			milliseconds: value % 1000,
		});
	},
	items(count: number) {
		return new Intl.NumberFormat("en-GB").format(count);
	},
};

export async function getDocuments(): Promise<Result<Array<ResourceCollectionDocument>, Error>> {
	const documents: Array<ResourceCollectionDocument> = [];

	/** ========================================================================================== */

	log.info("Retrieving data from OpenAIRE.");

	let start = performance.now();

	const openAireResponse = await getOpenAireDocuments();

	if (isErr(openAireResponse)) {
		return err(
			new Error("Failed to retrieve data from OpenAIRE.", { cause: openAireResponse.error }),
		);
	}

	documents.push(...openAireResponse.value);

	let end = performance.now();
	let duration = formatters.duration(end - start);
	let count = formatters.items(openAireResponse.value.length);

	log.success(`Retrieved ${count} documents from OpenAIRE in ${duration}.`);

	/** ========================================================================================== */

	log.info("Retrieving data from SSH Open Marketplace.");

	start = performance.now();

	const sshOpenMarketplaceResponse = await getSshOpenMarketplaceDocuments();

	if (isErr(sshOpenMarketplaceResponse)) {
		return err(
			new Error("Failed to retrieve data from SSH Open Marketplace.", {
				cause: sshOpenMarketplaceResponse.error,
			}),
		);
	}

	documents.push(...sshOpenMarketplaceResponse.value);

	end = performance.now();
	duration = formatters.duration(end - start);
	count = formatters.items(sshOpenMarketplaceResponse.value.length);

	log.success(`Retrieved ${count} documents from SSH Open Marketplace in ${duration}.`);

	/** ========================================================================================== */

	log.info("Retrieving data from Zotero.");

	start = performance.now();

	const zoteroResponse = await getZoteroDocuments();

	if (isErr(zoteroResponse)) {
		return err(new Error("Failed to retrieve data from Zotero.", { cause: zoteroResponse.error }));
	}

	documents.push(...zoteroResponse.value);

	end = performance.now();
	duration = formatters.duration(end - start);
	count = formatters.items(zoteroResponse.value.length);

	log.success(`Retrieved ${count} documents from Zotero in ${duration}.`);

	/** ========================================================================================== */

	return ok(documents);
}
