import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";
import { persons } from "./persons";

export const impactCaseStudies = p.pgTable("impact_case_studies", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	...f.timestamps(),
});

export type ImpactCaseStudy = typeof impactCaseStudies.$inferSelect;
export type ImpactCaseStudyInput = typeof impactCaseStudies.$inferInsert;

export const ImpactCaseStudySelectSchema = createSelectSchema(impactCaseStudies);
export const ImpactCaseStudyInsertSchema = createInsertSchema(impactCaseStudies);
export const ImpactCaseStudyUpdateSchema = createUpdateSchema(impactCaseStudies);

export const impactCaseStudiesToPersons = p.pgTable(
	"impact_case_studies_to_persons",
	{
		impactCaseStudyId: p
			.uuid("impact_case_study_id")
			.notNull()
			.references(() => {
				return impactCaseStudies.id;
			}),
		personId: p
			.uuid("person_id")
			.notNull()
			.references(() => {
				return persons.id;
			}),
		...f.timestamps(),
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
