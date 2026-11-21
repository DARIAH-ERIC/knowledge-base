import type { PoolConfig } from "drizzle-orm/postgres";

/**
 * Pool defaults shared by every database client.
 *
 * `int8: "string"` keeps raw `db.execute()` results the way `pg` returned them: the bundled driver
 * decodes `int8` (e.g. `count(*)`) as `BigInt` by default, which `JSON.stringify` and server action
 * responses cannot serialize. Query builders are unaffected — their codecs request lossless output
 * per query and decode columns by their declared mode.
 */
export const clientDefaults = {
	int8: "string",
} satisfies Partial<PoolConfig>;
