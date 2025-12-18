import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";

export const organisationalUnitTypes = ["body", "consortium", "institution"] as const;
export const organisationalUnitStatus = [
	"cooperating_partner",
	"member_country",
	"national_coordinating_institution",
	"national_representative_institution",
	"partner_institution",
] as const;

export const organisationalUnits = p.pgTable("organisational_units", {
	id: f.uuidv7("id").primaryKey(),
	name: p.text("name").notNull(),
	summary: p.text("summary").notNull(),
	imageId: f.uuidv7("image_id").references(() => {
		return assets.id;
	}),
	slug: p.text("slug").notNull().unique(),
	type: p.text("type", { enum: organisationalUnitTypes }).notNull(),
	...f.timestamps(),
});

export const organisationalUnitsRelations = p.pgTable(
	"units_to_units",
	{
		unitId: f
			.uuidv7("unit_id")
			.notNull()
			.references(() => {
				return organisationalUnits.id;
			}),
		relatedUnitId: f
			.uuidv7("related_unit_id")
			.notNull()
			.references(() => {
				return organisationalUnits.id;
			}),
		startDate: p.date("start_date", { mode: "date" }),
		endDate: p.date("end_date", { mode: "date" }),
		status: p.text("status", { enum: organisationalUnitStatus }).notNull(),
	},
	(t) => {
		return [p.primaryKey({ columns: [t.unitId, t.relatedUnitId], name: "units_to_units_pkey" })];
	},
);

export type OrganisationalUnit = typeof organisationalUnits.$inferSelect;
export type OrganisationalUnitInput = typeof organisationalUnits.$inferInsert;

export const OrganisationalUnitSelectSchema = createSelectSchema(organisationalUnits);
export const OrganisationalUnitInsertSchema = createInsertSchema(organisationalUnits);
export const OrganisationalUnitUpdateSchema = createUpdateSchema(organisationalUnits);
