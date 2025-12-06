import * as fs from "node:fs";

import dotenv from "dotenv";

async function main() {
	const githubEnv = process.env.GITHUB_ENV!;

	const filePath = process.env.INPUT_PATH || ".env";
	const fileContent = fs.readFileSync(filePath, { encoding: "utf-8" });

	const parsed = dotenv.parse(fileContent);

	for (const [key, value] of Object.entries(parsed)) {
		fs.appendFileSync(githubEnv, `${key}=${value}\n`, { encoding: "utf-8" });
	}

	console.log(`Successfully loaded environment variables from "${filePath}".`);
}

main().catch((error: unknown) => {
	console.error("Failed to load environment variables.\n", error);
	process.exitCode = 1;
});
