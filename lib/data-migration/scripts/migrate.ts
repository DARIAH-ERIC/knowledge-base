import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";

import { getWordPressData, type WordPressData } from "../src/lib/get-wordpress-data";

const apiBaseUrl = "https://www.dariah.eu";

const outputFolderPath = path.join(process.cwd(), ".cache");
const outputFilePath = path.join(outputFolderPath, "wordpress.json");

async function getData(): Promise<WordPressData> {
	if (existsSync(outputFolderPath)) {
		const data = await fs.readFile(outputFilePath, { encoding: "utf-8" });
		return JSON.parse(data) as WordPressData;
	}

	const data = await getWordPressData(apiBaseUrl);

	await fs.mkdir(outputFolderPath, { recursive: true });
	await fs.writeFile(outputFilePath, JSON.stringify(data, null, 2), { encoding: "utf-8" });

	return data;
}

async function main() {
	const _data = await getData();

	log.success("Successfully completed data migration.");
}

main().catch((error: unknown) => {
	log.error("Failed to complete data migration.", error);
	process.exitCode = 1;
});
