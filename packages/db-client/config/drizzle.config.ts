import path from "node:path";

import { defineConfig } from "drizzle-kit";

import { credentials } from "./db.config";

export default defineConfig({
	out: `${path.resolve(__dirname)}/../migrations`,
	schema: `${path.resolve(__dirname)}/../schema`,
	dialect: "postgresql",
	dbCredentials: credentials,
});
