import { defineConfig } from "oxlint";

import base from "@dariah-eric/configs/oxlint/base";
import turbo from "@dariah-eric/configs/oxlint/turbo";

const config = defineConfig({
	extends: [base, turbo],
	options: {
		reportUnusedDisableDirectives: "error",
		typeAware: true,
		typeCheck: true,
	},
});

export default config;
