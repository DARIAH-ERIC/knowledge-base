import * as p from "drizzle-orm/pg-core";

import * as f from "../fields";
import { entities } from "./entities";

export const reports = p.pgTable("reports", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	year: p.integer().notNull(),
	...f.timestamps(),
});
