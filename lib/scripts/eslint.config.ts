import node from "@dariah-eric/dariah-knowledge-base-configs/eslint/node";
import turbo from "@dariah-eric/dariah-knowledge-base-configs/eslint/turbo";
import { defineConfig } from "eslint/config";

const config = defineConfig(node, turbo);

export default config;
