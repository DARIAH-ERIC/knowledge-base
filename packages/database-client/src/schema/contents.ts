import * as p from "drizzle-orm/pg-core";

import * as f from "../fields";

export const contents = p.pgTable("contents", {
	id: f.uuidv7("id").primaryKey(),
});
