import tailwindConfig from "@acdh-oeaw/eslint-config-tailwindcss";
import { defineConfig } from "eslint/config";

const config = defineConfig({
	name: "tailwindcss-config",
	extends: [tailwindConfig],
	rules: {
		"better-tailwindcss/no-unknown-classes": ["error", { ignore: ["lead", "not-richtext"] }],
	},
});

export default config;
