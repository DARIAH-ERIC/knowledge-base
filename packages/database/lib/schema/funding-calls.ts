import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { entities } from "./entities";

export const fundingCalls = p.pgTable("funding_calls", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	summary: p.text("summary"),
	duration: f.timestampRange("duration").notNull(),
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
