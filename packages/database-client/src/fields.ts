/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

export function uuidv7(name?: string) {
	return uuid(name).default(sql`uuidv7()`);
}

export function timestamps() {
	return {
		createdAt: timestamp({
			mode: "date",
			precision: 3,
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
		updatedAt: timestamp({
			mode: "date",
			precision: 3,
			withTimezone: true,
		})
			.notNull()
			.defaultNow()
			.$onUpdate(() => {
				return new Date();
			}),
		deletedAt: timestamp({
			mode: "date",
			precision: 3,
			withTimezone: true,
		}),
	};
}
