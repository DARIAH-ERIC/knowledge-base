import { isNull } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { persons } from "./persons";

export const impactCaseStudies = p.pgTable(
	"impact_case_studies",
	{
		id: f.uuidv7("id").primaryKey(),
		title: p.text("title").notNull(),
		summary: p.text("summary").notNull(),
		imageId: f
			.uuidv7("image_id")
			.notNull()
			.references(() => {
				return assets.id;
			}),
		slug: p.text("slug").notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.index("impact_case_studies_slug_index").on(t.slug),
			p.index("impact_case_studies_deleted_at_index").on(t.deletedAt).where(isNull(t.deletedAt)),
		];
	},
);

export type ImpactCaseStudy = typeof impactCaseStudies.$inferSelect;
export type ImpactCaseStudyInput = typeof impactCaseStudies.$inferInsert;

export const ImpactCaseStudySelectSchema = createSelectSchema(impactCaseStudies);
export const ImpactCaseStudyInsertSchema = createInsertSchema(impactCaseStudies);
export const ImpactCaseStudyUpdateSchema = createUpdateSchema(impactCaseStudies);

export const impactCaseStudiesToPersons = p.pgTable(
	"impact_case_studies_to_persons",
	{
		impactCaseStudyId: f
			.uuidv7("impact_case_study_id")
			.notNull()
			.references(() => {
				return impactCaseStudies.id;
			}),
		personId: f
			.uuidv7("person_id")
			.notNull()
			.references(() => {
				return persons.id;
			}),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.impactCaseStudyId, t.personId],
				name: "impact_case_studies_to_persons_pkey",
			}),
		];
	},
);
