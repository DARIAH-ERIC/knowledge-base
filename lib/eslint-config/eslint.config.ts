import { defineConfig } from "eslint/config";

import node from "./src/node.ts";
import turbo from "./src/turbo.ts";

const config = defineConfig(node, turbo);

export default config;
