import { defineConfig } from "eslint/config";

import node from "./src/node.ts";

const config = defineConfig(node);

export default config;
