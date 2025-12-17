import { err, isErr, log, ok, type Result } from "@acdh-oeaw/lib";

import { getDocuments as getOpenAireDocuments } from "./documents/open-aire";
import { getDocuments as getSshOpenMarketplaceDocuments } from "./documents/sshoc";
import { getDocuments as getZoteroDocuments } from "./documents/zotero";
import type { ResourceCollectionDocument } from "./schema";

const formatters = {
	duration: new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
	items: new Intl.NumberFormat("en-GB"),
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
	let duration = formatters.duration.format(end - start);
	let count = formatters.items.format(openAireResponse.value.length);

	log.success(`Retrieved ${count} documents from OpenAIRE in ${duration} ms.`);

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
	duration = formatters.duration.format(end - start);
	count = formatters.items.format(sshOpenMarketplaceResponse.value.length);

	log.success(`Retrieved ${count} documents from SSH Open Marketplace in ${duration} ms.`);

	/** ========================================================================================== */

	log.info("Retrieving data from Zotero.");

	start = performance.now();

	const zoteroResponse = await getZoteroDocuments();

	if (isErr(zoteroResponse)) {
		return err(new Error("Failed to retrieve data from Zotero.", { cause: zoteroResponse.error }));
	}

	documents.push(...zoteroResponse.value);

	end = performance.now();
	duration = formatters.duration.format(end - start);
	count = formatters.items.format(zoteroResponse.value.length);

	log.success(`Retrieved ${count} documents from Zotero in ${duration} ms.`);

	/** ========================================================================================== */

	return ok(documents);
}
