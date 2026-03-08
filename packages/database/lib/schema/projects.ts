import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { assets } from "./assets";
import { entities } from "./entities";
import { organisationalUnits } from "./organisational-units";
import { reports } from "./reports";

export const projectScopesEnum = ["eu", "national", "regional"] as const;

export const projectScopes = p.pgTable(
	"project_scopes",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("scope", { enum: projectScopesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("project_scopes_scope_enum_check", inArray(t.type, projectScopesEnum))];
	},
);

export const projectRolesEnum = ["participant", "coordinator"] as const;

export const projectRoles = p.pgTable(
	"project_roles",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("role", { enum: projectRolesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("project_roles_role_enum_check", inArray(t.type, projectRolesEnum))];
	},
);

export const projects = p.pgTable("projects", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	metadata: p.jsonb("metadata"),
	name: p.text("name").notNull(),
	duration: f.timestampRange("duration").notNull(),
	/** Funding amount may be ingested from CORDIS. */
	funding: p.numeric("funding"),
	summary: p.text("summary").notNull(),
	call: p.text("call").notNull(),
	funders: p.text("funders").notNull(),
	topic: p.text("topic").notNull(),
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

export const ProjectInputSelectSchema = createSelectSchema(projects);
export const ProjectInputInsertSchema = createInsertSchema(projects);
export const ProjectInputUpdateSchema = createUpdateSchema(projects);

export const projectsToOrganisationalUnitsRelations = p.pgTable(
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
		projectRoleId: p
			.uuid("role_id")
			.notNull()
			.references(() => {
				return projectRoles.id;
			}),
		duration: f.timestampRange("duration"),
	},
);

export type ProjectsToOrganisationalUnitsRelation =
	typeof projectsToOrganisationalUnitsRelations.$inferSelect;
export type ProjectsToOrganisationalUnitsRelationInput =
	typeof projectsToOrganisationalUnitsRelations.$inferInsert;

export const ProjectsToOrganisationalUnitsRelationSelectSchema = createSelectSchema(
	projectsToOrganisationalUnitsRelations,
);
export const ProjectsToOrganisationalUnitsRelationInsertSchema = createInsertSchema(
	projectsToOrganisationalUnitsRelations,
);
export const ProjectsToOrganisationalUnitsRelationUpdateSchema = createUpdateSchema(
	projectsToOrganisationalUnitsRelations,
);

export const projectsContributions = p.pgTable("project_contributions", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	projectsToOrganisationalUnitsRelationsId: p
		.uuid("project_to_organisational_unit_id")
		.references(() => {
			return projectsToOrganisationalUnitsRelations.id;
		}),
	reportId: p
		.uuid("report_id")
		.notNull()
		.references(() => {
			return reports.id;
		}),
	budget: p.numeric(),
});

export type ProjectsContribution = typeof projectsContributions.$inferSelect;
export type ProjectsContributionInput = typeof projectsContributions.$inferInsert;

export const ProjectsContributionSelectSchema = createSelectSchema(projectsContributions);
export const ProjectsContributionInsertSchema = createInsertSchema(projectsContributions);
export const ProjectsContributionUpdateSchema = createUpdateSchema(projectsContributions);
