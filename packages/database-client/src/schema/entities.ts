import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const entityTypes = ["events", "news"] as const;

export const entities = p.pgTable(
	"entities",
	{
		id: f.uuidv7("id").primaryKey(),
		entityId: f.uuidv7("entity_id").notNull(),
		entityType: p.text("entity_type", { enum: entityTypes }).notNull(),
	},
	(t) => {
		return [p.unique("entities_entity_id_entity_type_unique").on(t.entityId, t.entityType)];
	},
);

export type Entity = typeof entities.$inferSelect;
export type EntityInput = typeof entities.$inferInsert;

export const EntitySelectSchema = createSelectSchema(entities);
export const EntityInsertSchema = createInsertSchema(entities);
export const EntityUpdateSchema = createUpdateSchema(entities);

export const fields = p.pgTable(
	"fields",
	{
		id: f.uuidv7("id").primaryKey(),
		entityId: f
			.uuidv7("entity_id")
			.notNull()
			.references(() => {
				return entities.id;
			}),
		name: p.text("name").notNull(),
	},
	(t) => {
		return [p.unique("fields_entity_id_name_unique").on(t.entityId, t.name)];
	},
);

export type Field = typeof fields.$inferSelect;
export type FieldInput = typeof fields.$inferInsert;

export const FieldSelectSchema = createSelectSchema(fields);
export const FieldInsertSchema = createInsertSchema(fields);
export const FieldUpdateSchema = createUpdateSchema(fields);
