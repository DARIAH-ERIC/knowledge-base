import * as path from "node:path";

import next from "@dariah-eric/dariah-knowledge-base-eslint-config/next";
import node from "@dariah-eric/dariah-knowledge-base-eslint-config/node";
import storybook from "@dariah-eric/dariah-knowledge-base-eslint-config/storybook";
import { defineConfig } from "eslint/config";

export default defineConfig(
	next,
	{
		settings: {
			"better-tailwindcss": {
				entryPoint: path.resolve("./styles/index.css"),
			},
		},
	},
	storybook,
	{
		name: "node-config",
		extends: [node],
		files: ["vite.config.ts", "scripts/**/*.ts"],
	},
	{
		rules: {
			"check-file/filename-naming-convention": [
				"error",
				{
					"**/*": "KEBAB_CASE",
				},
				{ ignoreMiddleExtensions: true },
			],
			"check-file/folder-naming-convention": [
				"error",
				{
					"**/": "?(.)+([a-z])*([a-z0-9])*(-+([a-z0-9]))",
				},
			],
		},
	},
	{
		files: [".storybook/main.ts", ".storybook/preview.ts"],
		rules: {
			"import-x/no-default-export": "off",
		},
	},
);
