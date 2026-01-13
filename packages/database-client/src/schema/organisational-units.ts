import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { assets } from "./assets";

export const organisationalUnitTypes = ["body", "consortium", "institution"] as const;
export const organisationalUnitStatus = [
	"cooperating_partner",
	"member",
	"national_coordinating_institution",
	"national_representative_institution",
	"partner_institution",
] as const;

export const organisationalUnits = p.pgTable("organisational_units", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	name: p.text("name").notNull(),
	summary: p.text("summary").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	slug: p.text("slug").notNull().unique(),
	type: p.text("type", { enum: organisationalUnitTypes }).notNull(),
	...f.timestamps(),
});

export const organisationalUnitsRelations = p.pgTable(
	"organisational_units_to_units",
	{
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
		startDate: p.date("start_date", { mode: "date" }),
		endDate: p.date("end_date", { mode: "date" }),
		status: p.text("status", { enum: organisationalUnitStatus }).notNull(),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.unitId, t.relatedUnitId],
				name: "organisational_units_to_units_pkey",
			}),
		];
	},
);

export const organisationalUnitsAllowedRelations = p.pgTable(
	"organisational_units_allowed_relations",
	{
		unitType: p.text("type", { enum: organisationalUnitTypes }).notNull(),
		relatedUnitType: p.text("related_unit_type", { enum: organisationalUnitTypes }).notNull(),
		relationType: p.text("relation_type", { enum: organisationalUnitStatus }).notNull(),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.unitType, t.relatedUnitType, t.relationType],
				name: "organisational_units_allowed_relations_pkey",
			}),
		];
	},
);

export type OrganisationalUnit = typeof organisationalUnits.$inferSelect;
export type OrganisationalUnitInput = typeof organisationalUnits.$inferInsert;

export type OrganisationalUnitRelation = typeof organisationalUnitsRelations.$inferSelect;
export type OrganisationalUnitRelationInput = typeof organisationalUnitsRelations.$inferInsert;

export type OrganisationalUnitAllowedRelation =
	typeof organisationalUnitsAllowedRelations.$inferSelect;
export type OrganisationalUnitAllowedRelationInput =
	typeof organisationalUnitsAllowedRelations.$inferInsert;

export const OrganisationalUnitSelectSchema = createSelectSchema(organisationalUnits);
export const OrganisationalUnitInsertSchema = createInsertSchema(organisationalUnits);
export const OrganisationalUnitUpdateSchema = createUpdateSchema(organisationalUnits);

export const OrganisationalUnitRelationSelectSchema = createSelectSchema(
	organisationalUnitsRelations,
);
export const OrganisationalUnitRelationInsertSchema = createInsertSchema(
	organisationalUnitsRelations,
);
export const OrganisationalUnitRelationUpdateSchema = createUpdateSchema(
	organisationalUnitsRelations,
);

export const OrganisationalUnitAllowedRelationSelectSchema = createSelectSchema(
	organisationalUnitsAllowedRelations,
);
export const OrganisationalUnitAllowedRelationInsertSchema = createInsertSchema(
	organisationalUnitsAllowedRelations,
);
export const OrganisationalUnitAllowedRelationUpdateSchema = createUpdateSchema(
	organisationalUnitsAllowedRelations,
);
