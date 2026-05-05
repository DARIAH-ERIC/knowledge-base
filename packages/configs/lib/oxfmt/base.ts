import { defineConfig } from "oxfmt";

const config = defineConfig({
	ignorePatterns: [
		"pnpm-workspace.yaml",
		"apps/*/contents/",
		"apps/*/e2e/snapshots/",
		"apps/*/public/",
		"packages/*/db/migrations/",
		"turbo/generators/templates/**/*.hbs",
	],
	jsdoc: true,
	printWidth: 100,
	sortImports: {
		groups: [
			["side_effect"],
			["side_effect_style"],
			["style"],
			["builtin"],
			["external"],
			["internal", "subpath"],
			["unknown"],
		],
	},
	sortPackageJson: {
		sortScripts: true,
	},
	useTabs: true,
});

export default config;
