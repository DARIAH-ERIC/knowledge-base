import * as p from "drizzle-orm/pg-core";

import * as f from "../fields";
import { entities } from "./entities";

// reports need to be related to orga units
// reports need to be related to social media
// reports need to be related to services
// we need wg-reports

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
