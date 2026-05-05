import { defineConfig } from "oxfmt";

const config = defineConfig({
	ignorePatterns: [
		"pnpm-workspace.yaml",
		"contents/",
		"db/migrations/",
		"e2e/snapshots/",
		"public/",
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
