import { parseArgs } from "node:util";

import { log } from "@acdh-oeaw/lib";
import { pgGenerate } from "drizzle-dbml-generator";

import * as schema from "../src/schema";

// eslint-disable-next-line @typescript-eslint/require-await
async function main() {
	const { positionals } = parseArgs({ allowPositionals: true });
	const out = positionals.at(0);

	const dbml = pgGenerate({ schema, out, relational: false });

	if (out != null) {
		log.success(`Successfully written dbml schema to "${out}".`);
	} else {
		log.success("Successfully generated dbml schema.\n", dbml);
	}
}

main().catch((error: unknown) => {
	log.error("Failed to generate dbml schema.\n", error);
});
