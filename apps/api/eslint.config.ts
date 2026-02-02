import drizzle from "@dariah-eric/configs/eslint/drizzle";
import node from "@dariah-eric/configs/eslint/node";
import turbo from "@dariah-eric/configs/eslint/turbo";
import { defineConfig } from "eslint/config";

const config = defineConfig(node, turbo, drizzle, {
	name: "data-access-layer-config",
	ignores: [
		"src/middlewares/db.ts",
		"src/routes/**/schemas.ts",
		"src/routes/**/service.ts",
		"test/**/*.ts",
	],
	rules: {
		"@typescript-eslint/no-restricted-imports": [
			"error",
			{
				patterns: [
					{
						allowTypeImports: true,
						group: ["@dariah-eric/database"],
						message: "Please use the data access layer in `lib/data/`.",
					},
				],
			},
		],
	},
});

export default config;
