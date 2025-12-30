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
			contentBlocks: schema.contentBlocks,
			dataContentBlocks: schema.dataContentBlocks,
			embedContentBlocks: schema.embedContentBlocks,
			entities: schema.entities,
			entitiesToEntities: schema.entitiesToEntities,
			entitiesToResources: schema.entitiesToResources,
			events: schema.events,
			fields: schema.fields,
			imageContentBlocks: schema.imageContentBlocks,
			impactCaseStudies: schema.impactCaseStudies,
			impactCaseStudiesToPersons: schema.impactCaseStudiesToPersons,
			licenses: schema.licenses,
			news: schema.news,
			pages: schema.pages,
			persons: schema.persons,
			richTextContentBlocks: schema.richTextContentBlocks,
			spotlightArticles: schema.spotlightArticles,
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
