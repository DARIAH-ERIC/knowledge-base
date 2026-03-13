import { writeFile } from "node:fs/promises";

import { log } from "@acdh-oeaw/lib";
import generate, { astToString } from "openapi-typescript";

async function main() {
	const ast = await generate("https://marketplace-api.sshopencloud.eu/v3/api-docs");

	const contents = astToString(ast);

	await writeFile("lib/types.ts", contents, { encoding: "utf-8" });

	log.success("Successfully generated sshoc api client.");
}

main().catch((error: unknown) => {
	log.error("Failed to generate sshoc api client.\n", error);
});
