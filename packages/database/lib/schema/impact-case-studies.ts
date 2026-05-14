import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entityVersions } from "./entities";
import { persons } from "./persons";

export const impactCaseStudies = p.snakeCase.table("impact_case_studies", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => entityVersions.id),
	title: p.text("title").notNull(),
	summary: p.text("summary").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => assets.id),
	...f.timestamps(),
});

export type ImpactCaseStudy = typeof impactCaseStudies.$inferSelect;
export type ImpactCaseStudyInput = typeof impactCaseStudies.$inferInsert;

export const ImpactCaseStudySelectSchema = createSelectSchema(impactCaseStudies);
export const ImpactCaseStudyInsertSchema = createInsertSchema(impactCaseStudies);
export const ImpactCaseStudyUpdateSchema = createUpdateSchema(impactCaseStudies);

export const articleContributorRolesEnum = ["author", "editor", "contributor"] as const;
export type ArticleContributorRole = (typeof articleContributorRolesEnum)[number];

export const impactCaseStudiesToPersons = p.snakeCase.table(
	"impact_case_studies_to_persons",
	{
		impactCaseStudyId: p
			.uuid("impact_case_study_id")
			.notNull()
			.references(() => impactCaseStudies.id),
		personId: p
			.uuid("person_id")
			.notNull()
			.references(() => persons.id),
		role: p.text("role", { enum: articleContributorRolesEnum }).notNull().default("author"),
		...f.timestamps(),
	},
	(t) => [
			p.primaryKey({
				columns: [t.impactCaseStudyId, t.personId],
				name: "impact_case_studies_to_persons_pkey",
			}),
		],
);
