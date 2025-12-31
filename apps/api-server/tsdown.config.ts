import { defineConfig } from "tsdown";

export default defineConfig({
	clean: true,
	dts: false,
	format: ["esm"],
	minify: true,
	sourcemap: true,
	treeshake: true,
	tsconfig: "./tsconfig.build.json",
});
