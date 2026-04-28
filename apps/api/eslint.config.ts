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
});

export default config;
