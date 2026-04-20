import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { assets } from "./assets";
import { entities } from "./entities";
import { articleContributorRolesEnum } from "./impact-case-studies";
import { persons } from "./persons";

export const spotlightArticles = p.pgTable("spotlight_articles", {
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

export type SpotlightArticle = typeof spotlightArticles.$inferSelect;
export type SpotlightArticleInput = typeof spotlightArticles.$inferInsert;

export const SpotlightArticleSelectSchema = createSelectSchema(spotlightArticles);
export const SpotlightArticleInsertSchema = createInsertSchema(spotlightArticles);
export const SpotlightArticleUpdateSchema = createUpdateSchema(spotlightArticles);

export const spotlightArticlesToPersons = p.pgTable(
	"spotlight_articles_to_persons",
	{
		spotlightArticleId: p
			.uuid("spotlight_article_id")
			.notNull()
			.references(() => {
				return spotlightArticles.id;
			}),
		personId: p
			.uuid("person_id")
			.notNull()
			.references(() => {
				return persons.id;
			}),
		role: p.text("role", { enum: articleContributorRolesEnum }).notNull().default("author"),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.primaryKey({
				columns: [t.spotlightArticleId, t.personId],
				name: "spotlight_articles_to_persons_pkey",
			}),
		];
	},
);
