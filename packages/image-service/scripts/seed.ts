import * as fs from "node:fs/promises";
import * as path from "node:path";
import { parseArgs } from "node:util";

import { log } from "@acdh-oeaw/lib";
import * as v from "valibot";

import { seed } from "../src/seed";

const ArgsSchema = v.object(
	{ folder: v.pipe(v.string(), v.nonEmpty()) },
	"Please provide a valid image folder path via `--folder`",
);

async function main() {
	const { values } = parseArgs({ options: { folder: { type: "string", short: "f" } } });
	const { folder } = v.parse(ArgsSchema, values);
	const imagesFolder = path.resolve(folder);

	const images: Array<{ filePath: string }> = [];

	for (const entry of await fs.readdir(imagesFolder, { withFileTypes: true })) {
		if (!entry.isFile()) {
			continue;
		}

		const filePath = path.join(imagesFolder, entry.name);

		images.push({ filePath });
	}

	await seed({ images });

	log.success("Successfully uploaded images.");
}

main().catch((error: unknown) => {
	log.error("Failed to upload images.\n", error);
	process.exitCode = 1;
});
