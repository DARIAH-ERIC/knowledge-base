/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";

export function uuidv7(name?: string) {
	return p.uuid(name).default(sql`uuidv7()`);
}

export function timestamps() {
	return {
		createdAt: p
			.timestamp({
				mode: "date",
				precision: 3,
				withTimezone: true,
			})
			.notNull()
			.defaultNow(),
		updatedAt: p
			.timestamp({
				mode: "date",
				precision: 3,
				withTimezone: true,
			})
			.notNull()
			.defaultNow()
			.$onUpdate(() => {
				return sql`CURRENT_TIMESTAMP`;
			}),
		deletedAt: p.timestamp({
			mode: "date",
			precision: 3,
			withTimezone: true,
		}),
	};
}
