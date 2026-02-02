import * as path from "node:path";

import next from "@dariah-eric/configs/eslint/next";
import node from "@dariah-eric/configs/eslint/node";
import storybook from "@dariah-eric/configs/eslint/storybook";
import turbo from "@dariah-eric/configs/eslint/turbo";
import { defineConfig } from "eslint/config";

export default defineConfig(
	next,
	turbo,
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
