import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";

export const entityTypesEnum = [
	"events",
	"impact_case_studies",
	"news",
	"pages",
	"persons",
	"spotlight_articles",
] as const;

export const entityTypes = p.pgTable(
	"entity_types",
	{
		id: f.uuidv7("id").primaryKey(),
		type: p.text("type", { enum: entityTypesEnum }).notNull(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("entity_types_type_enum_check", inArray(t.type, entityTypesEnum))];
	},
);

export type EntityType = typeof entityTypes.$inferSelect;
export type EntityTypeInput = typeof entityTypes.$inferInsert;

export const EntityTypeSelectSchema = createSelectSchema(entityTypes);
export const EntityTypeInsertSchema = createInsertSchema(entityTypes);
export const EntityTypeUpdateSchema = createUpdateSchema(entityTypes);

export const entityStatusEnum = ["draft", "published"] as const;

export const entityStatus = p.pgTable(
	"entity_status",
	{
		id: f.uuidv7("id").primaryKey(),
		type: p.text("type", { enum: entityStatusEnum }).notNull(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("entity_status_type_enum_check", inArray(t.type, entityStatusEnum))];
	},
);

export type EntityStatus = typeof entityStatus.$inferSelect;
export type EntityStatusInput = typeof entityStatus.$inferInsert;

export const EntityStatusSelectSchema = createSelectSchema(entityStatus);
export const EntityStatusInsertSchema = createInsertSchema(entityStatus);
export const EntityStatusUpdateSchema = createUpdateSchema(entityStatus);

export const entities = p.pgTable(
	"entities",
	{
		id: f.uuidv7("id").primaryKey(),
		typeId: p
			.text("type_id")
			.notNull()
			.references(() => {
				return entityTypes.id;
			}),
		documentId: f.uuidv7("document_id").notNull(),
		statusId: p
			.text("status_id")
			.notNull()
			.references(() => {
				return entityStatus.id;
			}),
		slug: p.text("slug").notNull(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.unique("entities_document_id_status_id_unique").on(t.documentId, t.statusId),
			p.unique("entities_document_id_slug_unique").on(t.documentId, t.slug),
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
		...f.timestamps(),
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
		...f.timestamps(),
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
		...f.timestamps(),
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
