import { parseArgs } from "node:util";

import { log } from "@acdh-oeaw/lib";
import { pgGenerate } from "drizzle-dbml-generator";

import * as schema from "../src/schema";

// eslint-disable-next-line @typescript-eslint/require-await
async function main() {
	const { positionals } = parseArgs({ allowPositionals: true });
	const out = positionals.at(0);

	const dbml = pgGenerate({
		// FIXME: need to manually provide schema because `drizzle-dbml-generator`
		// does not support drizzle beta yet.
		schema: {
			assets: schema.assets,
			blocks: schema.blocks,
			contents: schema.contents,
			dataBlocks: schema.dataBlocks,
			events: schema.events,
			eventsToResources: schema.eventsToResources,
			imageBlocks: schema.imageBlocks,
			licenses: schema.licenses,
			news: schema.news,
			newsToResources: schema.newsToResources,
			richTextBlocks: schema.richTextBlocks,
			users: schema.users,
		},
		out,
		relational: false,
	});

	if (out != null) {
		log.success(`Successfully written dbml schema to "${out}".`);
	} else {
		log.success("Successfully generated dbml schema.\n", dbml);
	}
}

main().catch((error: unknown) => {
	log.error("Failed to generate dbml schema.\n", error);
	process.exitCode = 1;
});
