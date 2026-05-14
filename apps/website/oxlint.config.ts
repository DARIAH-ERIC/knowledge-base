import * as path from "node:path";

import base from "@dariah-eric/configs/oxlint/base";
import nextjs from "@dariah-eric/configs/oxlint/nextjs";
import playwright from "@dariah-eric/configs/oxlint/playwright";
import react from "@dariah-eric/configs/oxlint/react";
import regexp from "@dariah-eric/configs/oxlint/regexp";
import tailwindcss from "@dariah-eric/configs/oxlint/tailwindcss";
import turbo from "@dariah-eric/configs/oxlint/turbo";
import { defineConfig } from "oxlint";

const config = defineConfig({
	extends: [base, nextjs, playwright, react, regexp, tailwindcss, turbo],
	options: {
		reportUnusedDisableDirectives: "error",
		typeAware: true,
		typeCheck: true,
	},
	rules: {
		"no-restricted-imports": ["error", { patterns: [{ group: ["./*", "../*"] }] }],
	},
	settings: {
		"better-tailwindcss": {
			cwd: import.meta.dirname,
			entryPoint: path.join(import.meta.dirname, "./styles/index.css"),
		},
	},
});

export default config;
