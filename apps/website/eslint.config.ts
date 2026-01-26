import drizzle from "@dariah-eric/dariah-knowledge-base-configs/eslint/drizzle";
import next, { restrictedImports } from "@dariah-eric/dariah-knowledge-base-configs/eslint/next";
import turbo from "@dariah-eric/dariah-knowledge-base-configs/eslint/turbo";
import { defineConfig } from "eslint/config";

const config = defineConfig(next, turbo, drizzle, {
	name: "data-access-layer-config",
	ignores: ["lib/data/**"],
	rules: {
		"@typescript-eslint/no-restricted-imports": [
			"error",
			{
				...restrictedImports,
				patterns: [
					{
						allowTypeImports: true,
						group: [
							"@dariah-eric/dariah-knowledge-base-database-client",
							"@dariah-eric/dariah-knowledge-base-image-service",
							"@dariah-eric/dariah-knowledge-base-search-index",
						],
						message: "Please use the data access layer in `lib/data/`.",
					},
				],
			},
		],
	},
});

export default config;
