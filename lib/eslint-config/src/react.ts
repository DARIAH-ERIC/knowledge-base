import reactConfig from "@acdh-oeaw/eslint-config-react";
import { defineConfig } from "eslint/config";
import perfectionistPlugin from "eslint-plugin-perfectionist";

const config = defineConfig(
	{
		name: "react-config",
		extends: [reactConfig],
		rules: {
			"@eslint-react/prefer-read-only-props": "error",
			/** Avoid hardcoded, non-translated strings. */
			"react/jsx-no-literals": [
				"error",
				{
					allowedStrings: [
						"&amp;",
						"&apos;",
						"&bull;",
						"&copy;",
						"&gt;",
						"&lt;",
						"&nbsp;",
						"&quot;",
						"&rarr;",
						"&larr;",
						"&mdash;",
						"&ndash;",
						".",
						"!",
						":",
						";",
						",",
						"-",
						"(",
						")",
						"|",
						"/",
					],
				},
			],
		},
	},
	{
		name: "stylistic-config",
		plugins: {
			perfectionist: perfectionistPlugin,
		},
		rules: {
			"perfectionist/sort-jsx-props": [
				"error",
				{
					customGroups: [
						{
							groupName: "reserved",
							elementNamePattern: ["^key$", "^ref$"],
						},
					],
					groups: ["reserved", "unknown"],
				},
			],
		},
	},
);

export default config;
