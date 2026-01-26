import { defineConfig } from "tsdown";

const config = defineConfig({
	clean: true,
	dts: false,
	format: ["esm"],
	minify: true,
	sourcemap: true,
	treeshake: true,
	tsconfig: "./tsconfig.build.json",
});

export default config;
