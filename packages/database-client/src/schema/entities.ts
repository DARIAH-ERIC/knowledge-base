import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";

export const entityTypesEnum = [
	"events",
	"impact_case_studies",
	"news",
	"organisational_units",
	"pages",
	"persons",
	"spotlight_articles",
] as const;

export const entityTypes = p.pgTable(
	"entity_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("type", { enum: entityTypesEnum }).notNull().unique(),
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
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("type", { enum: entityStatusEnum }).notNull().unique(),
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
		id: p.uuid("id").primaryKey().default(uuidv7()),
		typeId: p
			.uuid("type_id")
			.notNull()
			.references(() => {
				return entityTypes.id;
			}),
		documentId: p.uuid("document_id").notNull().default(uuidv7()),
		statusId: p
			.uuid("status_id")
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

export const entityTypesFieldsNames = p.pgTable(
	"entity_types_fields_names",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		entityTypeId: p
			.uuid("entity_type_id")
			.notNull()
			.references(() => {
				return entityTypes.id;
			}),
		fieldName: p.text("field_name").notNull(),
	},
	(t) => {
		return [
			p
				.unique("entity_types_fields_names_entity_type_id_field_name_unique")
				.on(t.entityTypeId, t.fieldName),
		];
	},
);

// only provide select for now: the entity type fields mapping should be changed via migrations
export type EntityTypesFieldsNames = typeof entityTypesFieldsNames.$inferSelect;

export const entityTypesFieldsNamesSelectSchema = createSelectSchema(entityTypesFieldsNames);

export const fields = p.pgTable(
	"fields",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		entityId: p
			.uuid("entity_id")
			.notNull()
			.references(() => {
				return entities.id;
			}),
		fieldNameId: p
			.uuid()
			.notNull()
			.references(() => {
				return entityTypesFieldsNames.id;
			}),
		...f.timestamps(),
	},
	(t) => {
		return [p.unique("fields_entity_id_field_name_id_unique").on(t.entityId, t.fieldNameId)];
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
		entityId: p
			.uuid("entity_id")
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
		entityId: p
			.uuid("entity_id")
			.notNull()
			.references(() => {
				return entities.id;
			}),
		relatedEntityId: p
			.uuid("related_entity_id")
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
