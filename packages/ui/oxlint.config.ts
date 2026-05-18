// import * as path from "node:path";

import base from "@dariah-eric/configs/oxlint/base";
import react from "@dariah-eric/configs/oxlint/react";
import storybook from "@dariah-eric/configs/oxlint/storybook";
// import tailwindcss from "@dariah-eric/configs/oxlint/tailwindcss";
import turbo from "@dariah-eric/configs/oxlint/turbo";
import vitest from "@dariah-eric/configs/oxlint/vitest";
import { defineConfig } from "oxlint";

const config = defineConfig({
	extends: [base, react, storybook, turbo, vitest],
	options: {
		reportUnusedDisableDirectives: "error",
		typeAware: true,
		typeCheck: true,
	},
	// settings: {
	// 	"better-tailwindcss": {
	// 		cwd: import.meta.dirname,
	// 		entryPoint: path.join(import.meta.dirname, "./styles/index.css"),
	// 	},
	// },
});

export default config;
