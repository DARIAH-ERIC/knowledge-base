import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: true,
	entry: ["./src/client.ts", "./src/schema.ts"],
	format: ["esm"],
	minify: false,
	sourcemap: true,
	treeshake: true,
});
