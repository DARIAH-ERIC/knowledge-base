import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const entityTypes = [
	"events",
	"impact_case_studies",
	"news",
	"pages",
	"spotlight_articles",
] as const;

export const entityStatus = ["draft", "published"] as const;

export const entities = p.pgTable(
	"entities",
	{
		id: f.uuidv7("id").primaryKey(),
		entityId: f.uuidv7("entity_id").notNull(),
		entityType: p.text("entity_type", { enum: entityTypes }).notNull(),
		documentId: f.uuidv7("document_id").notNull(),
		status: p.text("status", { enum: ["draft", "published"] }).notNull(),
	},
	(t) => {
		return [
			p.check("entities_status_enum_check", inArray(t.status, entityStatus)),
			p.unique("entities_entity_id_entity_type_unique").on(t.entityId, t.entityType),
			p.unique("entities_document_id_status_unique").on(t.documentId, t.status),
		];
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

export const entitiesToResources = p.pgTable(
	"entities_to_resources",
	{
		entityId: f
			.uuidv7("entity_id")
			.notNull()
			.references(() => {
				return entities.id;
			}),
		resourceId: p.text("resource_id").notNull(),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.entityId, t.resourceId],
				name: "entities_to_resources_pkey",
			}),
		];
	},
);

export const entitiesToEntities = p.pgTable(
	"entities_to_entities",
	{
		entityId: f
			.uuidv7("entity_id")
			.notNull()
			.references(() => {
				return entities.id;
			}),
		relatedEntityId: f
			.uuidv7("related_entity_id")
			.notNull()
			.references(() => {
				return entities.id;
			}),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.entityId, t.relatedEntityId],
				name: "entities_to_entities_pkey",
			}),
		];
	},
);
