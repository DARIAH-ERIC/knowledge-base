import * as path from "node:path";

import base from "@dariah-eric/dariah-knowledge-base-eslint-config/base";
import naming from "@dariah-eric/dariah-knowledge-base-eslint-config/naming-conventions";
import node from "@dariah-eric/dariah-knowledge-base-eslint-config/node";
import react from "@dariah-eric/dariah-knowledge-base-eslint-config/react";
import storybook from "@dariah-eric/dariah-knowledge-base-eslint-config/storybook";
import tailwindcss from "@dariah-eric/dariah-knowledge-base-eslint-config/tailwindcss";
import { defineConfig } from "eslint/config";

export default defineConfig(
	base,
	react,
	{
		extends: [tailwindcss],
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
	naming,
);
