import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entityVersions } from "./entities";

export const fundingCalls = p.snakeCase.table("funding_calls", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => entityVersions.id),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	duration: f.timestampRange("duration").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => assets.id),
	...f.timestamps(),
});

export type FundingCall = typeof fundingCalls.$inferSelect;
export type FundingCallInput = typeof fundingCalls.$inferInsert;

export const FundingCallSelectSchema = createSelectSchema(fundingCalls, {
	duration: f.TimestampRange,
});
export const FundingCallInsertSchema = createInsertSchema(fundingCalls, {
	duration: f.TimestampRange,
});
export const FundingCallUpdateSchema = createUpdateSchema(fundingCalls, {
	duration: f.TimestampRange,
});
