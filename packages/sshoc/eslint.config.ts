import node from "@dariah-eric/configs/eslint/node";
import turbo from "@dariah-eric/configs/eslint/turbo";
import { defineConfig, globalIgnores } from "eslint/config";

const config = defineConfig(node, turbo, globalIgnores(["lib/types.ts"]));

export default config;
