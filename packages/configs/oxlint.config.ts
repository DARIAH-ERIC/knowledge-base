import base from "@dariah-eric/configs/oxlint/base";
import turbo from "@dariah-eric/configs/oxlint/turbo";
import { defineConfig } from "oxlint";

const config = defineConfig({
	extends: [base, turbo],
	rules: {
		"import/no-default-export": "off",
	},
});

export default config;
