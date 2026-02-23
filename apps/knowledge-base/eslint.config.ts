import drizzle from "@dariah-eric/configs/eslint/drizzle";
import next from "@dariah-eric/configs/eslint/next";
import turbo from "@dariah-eric/configs/eslint/turbo";
import { defineConfig } from "eslint/config";

const config = defineConfig(next, turbo, drizzle);

export default config;
