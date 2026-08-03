import { defineConfig } from "oxlint";

import base from "@dariah-eric/configs/oxlint/base";
import drizzle from "@dariah-eric/configs/oxlint/drizzle";
import turbo from "@dariah-eric/configs/oxlint/turbo";

const config = defineConfig({
	extends: [base, drizzle, turbo],
	options: {
		reportUnusedDisableDirectives: "error",
		typeAware: true,
		typeCheck: true,
	},
});

export default config;
