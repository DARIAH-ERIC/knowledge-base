/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";

export function uuidv7(name?: string) {
	return p.uuid(name).default(sql`uuidv7()`);
}

export function timestamp() {
	return p.timestamp({
		mode: "date",
		precision: 3,
		withTimezone: true,
	});
}

export function timestamps() {
	return {
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => {
				return sql`CURRENT_TIMESTAMP`;
			}),
		deletedAt: timestamp(),
	};
}
