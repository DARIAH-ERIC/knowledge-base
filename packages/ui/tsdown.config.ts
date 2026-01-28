import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	copy: ["./messages/", "./styles/"],
	dts: true,
	entry: [
		"./src/**/*.ts",
		"./src/**/*.tsx",
		"!./src/**/*.stories.ts",
		"!./src/**/*.stories.tsx",
		"!./src/**/*.test.ts",
		"!./src/**/*.test.tsx",
	],
	format: ["esm"],
	minify: false,
	sourcemap: true,
	treeshake: true,
	unbundle: true,
});
