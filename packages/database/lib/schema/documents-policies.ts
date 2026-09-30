import { sql } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { documentPolicyGroups } from "./document-policy-groups";
import { entityVersions } from "./entities";

export const documentsPolicies = p.snakeCase.table(
	"documents_policies",
	{
		id: p
			.uuid("id")
			.primaryKey()
			.references(() => entityVersions.id),
		title: p.text("title").notNull(),
		summary: p.text("summary"),
		/** Supplementary link shown alongside the item, e.g. a doi. Not what the item points to. */
		url: p.text("url"),
		/** The uploaded file the item points to. Exactly one of this and {@link linkUrl} is set. */
		documentId: p.uuid("document_id").references(() => assets.id),
		/** The external page the item points to. Exactly one of this and {@link documentId} is set. */
		linkUrl: p.text("link_url"),
		groupId: p.uuid("group_id").references(() => documentPolicyGroups.id),
		position: p.integer("position").notNull().default(0),
		...f.timestamps(),
	},
	(t) => [
		p.check(
			"documents_policies_target",
			sql`
				(${t.documentId} IS NOT NULL AND ${t.linkUrl} IS NULL)
				OR (${t.documentId} IS NULL AND ${t.linkUrl} IS NOT NULL)
			`,
		),
	],
);

export type DocumentOrPolicy = typeof documentsPolicies.$inferSelect;
export type DocumentOrPolicyInput = typeof documentsPolicies.$inferInsert;

export const DocumentOrPolicySelectSchema = createSelectSchema(documentsPolicies);
export const DocumentOrPolicyInsertSchema = createInsertSchema(documentsPolicies);
export const DocumentOrPolicyUpdateSchema = createUpdateSchema(documentsPolicies);
