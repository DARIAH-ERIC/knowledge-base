import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: [
		"./lib/index.ts",
		"./lib/asset-cleanup-service.ts",
		"./lib/calculated-values.ts",
		"./lib/calculated-values-service.ts",
		"./lib/client.ts",
		"./lib/content-block-cleanup-service.ts",
		"./lib/errors.ts",
		"./lib/image-captions.ts",
		"./lib/integrity-service.ts",
		"./lib/relations.ts",
		"./lib/rich-text.ts",
		"./lib/schema.ts",
		"./lib/sql.ts",
	],
	format: ["esm"],
	minify: false,
	sourcemap: true,
	treeshake: true,
});
