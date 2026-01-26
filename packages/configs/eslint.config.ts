import { defineConfig } from "eslint/config";

import node from "./src/eslint/node.ts";
import turbo from "./src/eslint/turbo.ts";

const config = defineConfig(node, turbo);

export default config;
