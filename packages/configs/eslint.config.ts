import { defineConfig } from "eslint/config";

import node from "./lib/eslint/node.ts";
import turbo from "./lib/eslint/turbo.ts";

const config = defineConfig(node, turbo);

export default config;
