import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { assets } from "./assets";
import { entities } from "./entities";
import { organisationalUnits } from "./organisational-units";
import { reports } from "./reports";
import { socialMedia } from "./social-media";

export const projectScopesEnum = ["eu", "national", "regional"] as const;

export const projectScopes = p.pgTable(
	"project_scopes",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		scope: p.text("scope", { enum: projectScopesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("project_scopes_scope_enum_check", inArray(t.scope, projectScopesEnum))];
	},
);

export type ProjectScope = typeof projectScopes.$inferSelect;
export type ProjectScopeInput = typeof projectScopes.$inferInsert;

export const projectRolesEnum = ["coordinator", "funder", "participant"] as const;

export const projectRoles = p.pgTable(
	"project_roles",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		role: p.text("role", { enum: projectRolesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("project_roles_role_enum_check", inArray(t.role, projectRolesEnum))];
	},
);

export type ProjectRole = typeof projectRoles.$inferSelect;
export type ProjectRoleInput = typeof projectRoles.$inferInsert;

export const projects = p.pgTable("projects", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	metadata: p.jsonb("metadata"),
	name: p.text("name").notNull(),
	acronym: p.text("acronym"),
	duration: f.timestampRange("duration").notNull(),
	/** Funding amount may be ingested from CORDIS. */
	funding: p.numeric("funding", { mode: "number", precision: 12, scale: 2 }),
	summary: p.text("summary").notNull(),
	call: p.text("call"),
	topic: p.text("topic"),
	imageId: p.uuid("image_id").references(() => {
		return assets.id;
	}),
	scopeId: p
		.uuid("scope_id")
		.notNull()
		.references(() => {
			return projectScopes.id;
		}),
	...f.timestamps(),
});

export type Project = typeof projects.$inferSelect;
export type ProjectInput = typeof projects.$inferInsert;

export const ProjectSelectSchema = createSelectSchema(projects, { duration: f.TimestampRange });
export const ProjectInsertSchema = createInsertSchema(projects, { duration: f.TimestampRange });
export const ProjectUpdateSchema = createUpdateSchema(projects, { duration: f.TimestampRange });

export const projectsToOrganisationalUnits = p.pgTable(
	"projects_to_organisational_units",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		projectId: p
			.uuid("project_id")
			.notNull()
			.references(() => {
				return projects.id;
			}),
		unitId: p
			.uuid("unit_id")
			.notNull()
			.references(() => {
				return organisationalUnits.id;
			}),
		roleId: p
			.uuid("role_id")
			.notNull()
			.references(() => {
				return projectRoles.id;
			}),
		duration: f.timestampRange("duration"),
	},
	(t) => {
		return [p.unique().on(t.projectId, t.roleId, t.unitId)];
	},
);

export type ProjectToOrganisationalUnit = typeof projectsToOrganisationalUnits.$inferSelect;
export type ProjectToOrganisationalUnitInput = typeof projectsToOrganisationalUnits.$inferInsert;

export const ProjectToOrganisationalUnitSelectSchema = createSelectSchema(
	projectsToOrganisationalUnits,
	{
		duration: f.NullableTimestampRange,
	},
);
export const ProjectToOrganisationalUnitInsertSchema = createInsertSchema(
	projectsToOrganisationalUnits,
	{
		duration: f.NullableTimestampRange,
	},
);
export const ProjectToOrganisationalUnitUpdateSchema = createUpdateSchema(
	projectsToOrganisationalUnits,
	{
		duration: f.NullableTimestampRange,
	},
);

export const projectsContributions = p.pgTable("project_contributions", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	projectPartnerId: p.uuid("project_partner_id").references(() => {
		return projectsToOrganisationalUnits.id;
	}),
	reportId: p
		.uuid("report_id")
		.notNull()
		.references(() => {
			return reports.id;
		}),
	budget: p.numeric("budget", { mode: "number", precision: 12, scale: 2 }),
});

export type ProjectContribution = typeof projectsContributions.$inferSelect;
export type ProjectContributionInput = typeof projectsContributions.$inferInsert;

export const ProjectContributionSelectSchema = createSelectSchema(projectsContributions);
export const ProjectContributionInsertSchema = createInsertSchema(projectsContributions);
export const ProjectContributionUpdateSchema = createUpdateSchema(projectsContributions);

export const projectsToSocialMedia = p.pgTable("projects_to_social_media", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	projectId: p
		.uuid("project_id")
		.notNull()
		.references(() => {
			return projects.id;
		}),
	socialMediaId: p
		.uuid("social_media_id")
		.notNull()
		.references(() => {
			return socialMedia.id;
		}),
	...f.timestamps(),
});

export type ProjectToSocialMedia = typeof projectsToSocialMedia.$inferSelect;
export type ProjectToSocialMediaInput = typeof projectsToSocialMedia.$inferInsert;

export const ProjectToSocialMediaSelectSchema = createSelectSchema(projectsToSocialMedia);
export const ProjectToSocialMediaInsertSchema = createInsertSchema(projectsToSocialMedia);
export const ProjectToSocialMediaUpdateSchema = createUpdateSchema(projectsToSocialMedia);

export const dariahProjectsUnitType = "eric";

export const dariahProjects = p
	.pgView("dariah_projects", {
		id: p.uuid("id").notNull(),
		metadata: p.jsonb("metadata"),
		name: p.text("name").notNull(),
		summary: p.text("summary").notNull(),
		duration: f.timestampRange("duration").notNull(),
		call: p.text("call").notNull(),
		topic: p.text("topic").notNull(),
		funding: p.numeric("funding", { mode: "number", precision: 12, scale: 2 }),
		imageId: p.uuid("image_id"),
		scopeId: p.uuid("scope_id").notNull(),
	})
	.existing();
