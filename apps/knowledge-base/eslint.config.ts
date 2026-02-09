import drizzle from "@dariah-eric/configs/eslint/drizzle";
import next, { restrictedImports } from "@dariah-eric/configs/eslint/next";
import turbo from "@dariah-eric/configs/eslint/turbo";
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
						group: ["@dariah-eric/database", "@dariah-eric/images", "@dariah-eric/search"],
						message: "Please use the data access layer in `lib/data/`.",
					},
				],
			},
		],
	},
});

export default config;
