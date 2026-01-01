import { defineConfig } from "eslint/config";
// @ts-expect-error Missing type declarations.
import drizzlePlugin from "eslint-plugin-drizzle";

const config = defineConfig(
		{
		name: "drizzle-config",
		plugins: {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			drizzle: drizzlePlugin,
		},
		rules: {
			"drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
			"drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
		},
	}
);

export default config;
