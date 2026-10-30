import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { entities } from "./entities";

/**
 * Stable names for documents-policies entries whose current version changes over time, such as the
 * statutes. Fixed on purpose: a website serves each key at a stable url, so a new key needs a code
 * change on both sides anyway.
 */
export const documentPolicyAliasKeysEnum = ["internal-rules-of-procedure", "statutes"] as const;

export type DocumentPolicyAliasKey = (typeof documentPolicyAliasKeysEnum)[number];

/**
 * Which documents-policies entry an alias currently points to. Document-level: references
 * `entities.id`, not a version id, so republishing the entry keeps the alias, and deleting the
 * entry removes it. A key without a row is not set.
 */
export const documentPolicyAliases = p.snakeCase.table(
	"document_policy_aliases",
	{
		key: p.text("key", { enum: documentPolicyAliasKeysEnum }).primaryKey(),
		entityId: p
			.uuid("entity_id")
			.notNull()
			.references(() => entities.id, { onDelete: "cascade" }),
		...f.timestamps(),
	},
	(t) => [
		p.check("document_policy_aliases_key_enum_check", inArray(t.key, documentPolicyAliasKeysEnum)),
	],
);

export type DocumentPolicyAlias = typeof documentPolicyAliases.$inferSelect;
export type DocumentPolicyAliasInput = typeof documentPolicyAliases.$inferInsert;

export const DocumentPolicyAliasSelectSchema = createSelectSchema(documentPolicyAliases);
export const DocumentPolicyAliasInsertSchema = createInsertSchema(documentPolicyAliases);
export const DocumentPolicyAliasUpdateSchema = createUpdateSchema(documentPolicyAliases);
