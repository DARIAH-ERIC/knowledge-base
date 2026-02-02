import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: ["./src/index.ts", "./src/client.ts", "./src/relations.ts", "./src/schema.ts"],
	format: ["esm"],
	minify: false,
	sourcemap: true,
	treeshake: true,
});
