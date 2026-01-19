/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import * as p from "drizzle-orm/pg-core";

import { now } from "./functions";

export function timestamp(name: string) {
	return p.timestamp(name, {
		mode: "date",
		precision: 3,
		withTimezone: true,
	});
}

export function timestamps() {
	return {
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => {
				return now();
			}),
		// deletedAt: timestamp("deleted_at"),
	};
}
