import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { assets } from "./assets";
import { entities } from "./entities";

export const organisationalUnitTypesEnum = [
	"body",
	"consortium",
	"institution",
	"regional_hub",
	"umbrella_consortium",
] as const;

export const organisationalUnitTypes = p.pgTable(
	"organisational_unit_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("type", { enum: organisationalUnitTypesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.check(
				"organisational_unit_types_type_enum_check",
				inArray(t.type, organisationalUnitTypesEnum),
			),
		];
	},
);

export const organisationalUnitStatusEnum = [
	"is_cooperating_partner",
	"is_member",
	"is_national_coordinating_institution",
	"is_national_representative_institution",
	"is_partner_institution",
] as const;

export const organisationalUnitStatus = p.pgTable(
	"organisational_unit_status",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		status: p.text("status", { enum: organisationalUnitStatusEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.check(
				"organisational_unit_status_status_enum_check",
				inArray(t.status, organisationalUnitStatusEnum),
			),
		];
	},
);

export const organisationalUnits = p.pgTable("organisational_units", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	metadata: p.jsonb("metadata"),
	name: p.text("name").notNull(),
	summary: p.text("summary").notNull(),
	imageId: p.uuid("image_id").references(() => {
		return assets.id;
	}),
	typeId: p
		.uuid("type_id")
		.notNull()
		.references(() => {
			return organisationalUnitTypes.id;
		}),
	...f.timestamps(),
});

export type OrganisationalUnit = typeof organisationalUnits.$inferSelect;
export type OrganisationalUnitInput = typeof organisationalUnits.$inferInsert;

export const OrganisationalUnitSelectSchema = createSelectSchema(organisationalUnits);
export const OrganisationalUnitInsertSchema = createInsertSchema(organisationalUnits);
export const OrganisationalUnitUpdateSchema = createUpdateSchema(organisationalUnits);

export const organisationalUnitsRelations = p.pgTable("organisational_units_to_units", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	unitId: p
		.uuid("unit_id")
		.notNull()
		.references(() => {
			return organisationalUnits.id;
		}),
	relatedUnitId: p
		.uuid("related_unit_id")
		.notNull()
		.references(() => {
			return organisationalUnits.id;
		}),
	startDate: p.date("start_date", { mode: "date" }).notNull(),
	endDate: p.date("end_date", { mode: "date" }),
	status: p
		.uuid("status")
		.notNull()
		.references(() => {
			return organisationalUnitStatus.id;
		}),
});

export type OrganisationalUnitRelation = typeof organisationalUnitsRelations.$inferSelect;
export type OrganisationalUnitRelationInput = typeof organisationalUnitsRelations.$inferInsert;

export const OrganisationalUnitRelationSelectSchema = createSelectSchema(
	organisationalUnitsRelations,
);
export const OrganisationalUnitRelationInsertSchema = createInsertSchema(
	organisationalUnitsRelations,
);
export const OrganisationalUnitRelationUpdateSchema = createUpdateSchema(
	organisationalUnitsRelations,
);

export const organisationalUnitsAllowedRelations = p.pgTable(
	"organisational_units_allowed_relations",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		unitTypeId: p
			.uuid("unit_type_id")
			.notNull()
			.references(() => {
				return organisationalUnitTypes.id;
			}),
		relatedUnitTypeId: p
			.uuid("related_unit_type_id")
			.notNull()
			.references(() => {
				return organisationalUnitTypes.id;
			}),
		relationTypeId: p
			.uuid("relation_type_id")
			.notNull()
			.references(() => {
				return organisationalUnitStatus.id;
			}),
	},
	(t) => {
		return [p.unique().on(t.unitTypeId, t.relatedUnitTypeId, t.relationTypeId)];
	},
);

export type OrganisationalUnitAllowedRelation =
	typeof organisationalUnitsAllowedRelations.$inferSelect;
export type OrganisationalUnitAllowedRelationInput =
	typeof organisationalUnitsAllowedRelations.$inferInsert;

export const OrganisationalUnitAllowedRelationSelectSchema = createSelectSchema(
	organisationalUnitsAllowedRelations,
);
export const OrganisationalUnitAllowedRelationInsertSchema = createInsertSchema(
	organisationalUnitsAllowedRelations,
);
export const OrganisationalUnitAllowedRelationUpdateSchema = createUpdateSchema(
	organisationalUnitsAllowedRelations,
);
