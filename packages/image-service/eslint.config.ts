import node from "@dariah-eric/dariah-knowledge-base-eslint-config/node";
import turbo from "@dariah-eric/dariah-knowledge-base-eslint-config/turbo";
import { defineConfig } from "eslint/config";

const config = defineConfig(node, turbo);

export default config;
