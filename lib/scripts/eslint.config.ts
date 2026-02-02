import node from "@dariah-eric/configs/eslint/node";
import turbo from "@dariah-eric/configs/eslint/turbo";
import { defineConfig } from "eslint/config";

const config = defineConfig(node, turbo);

export default config;
