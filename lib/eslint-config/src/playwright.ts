import playwrightConfig from "@acdh-oeaw/eslint-config-playwright";
import { defineConfig } from "eslint/config";

const config = defineConfig(playwrightConfig);

export default config;
