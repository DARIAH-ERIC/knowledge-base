import { drizzle } from "drizzle-orm/node-postgres";

export type Client = Awaited<ReturnType<typeof createClient>>;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createClient() {
	const db = drizzle.mock({
		casing: "snake_case",
		logger: true,
	});

	return db;
}

export const db = createClient();
