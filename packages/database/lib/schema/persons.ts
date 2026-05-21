import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { assets } from "./assets";
import { entityVersions } from "./entities";
import { organisationalUnitTypes, organisationalUnits } from "./organisational-units";

export const personRoleTypesEnum = [
	"is_affiliated_with",
	"is_chair_of",
	"is_vice_chair_of",
	"is_member_of",
	"is_director_of",
	"is_president_of",
	"is_contact_for",
	"national_coordinator",
	"national_coordinator_deputy",
	"national_representative",
	"national_representative_deputy",
] as const;

export const persons = p.snakeCase.table("persons", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => entityVersions.id),
	name: p.text("name").notNull(),
	sortName: p.text("sort_name").notNull(),
	email: p.text("email"),
	orcid: p.text("orcid"),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => assets.id),
	...f.timestamps(),
});

export type Person = typeof persons.$inferSelect;
export type PersonInput = typeof persons.$inferInsert;

export const PersonSelectSchema = createSelectSchema(persons);
export const PersonInsertSchema = createInsertSchema(persons);
export const PersonUpdateSchema = createUpdateSchema(persons);

export const personRoleTypes = p.snakeCase.table(
	"person_role_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("type", { enum: personRoleTypesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => [p.check("person_role_types_type_enum_check", inArray(t.type, personRoleTypesEnum))],
);

export const personsToOrganisationalUnits = p.snakeCase.table("persons_to_organisational_units", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	personId: p
		.uuid("person_id")
		.notNull()
		.references(() => persons.id),
	organisationalUnitId: p
		.uuid("organisational_unit_id")
		.notNull()
		.references(() => organisationalUnits.id),
	roleTypeId: p
		.uuid("role_type_id")
		.notNull()
		.references(() => personRoleTypes.id),
	duration: f.timestampRange("duration").notNull(),
	...f.timestamps(),
});

export type PersonToOrganisationalUnit = typeof personsToOrganisationalUnits.$inferSelect;
export type PersonToOrganisationalUnitInput = typeof personsToOrganisationalUnits.$inferInsert;

export const PersonToOrganisationalUnitSelectSchema = createSelectSchema(
	personsToOrganisationalUnits,
);
export const PersonToOrganisationalUnitInsertSchema = createInsertSchema(
	personsToOrganisationalUnits,
);
export const PersonToOrganisationalUnitUpdateSchema = createUpdateSchema(
	personsToOrganisationalUnits,
);

export const personRoleTypesToOrganisationalUnitTypesAllowedRelations = p.snakeCase.table(
	"person_role_types_to_organisational_unit_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		roleTypeId: p
			.uuid("role_type_id")
			.notNull()
			.references(() => personRoleTypes.id),
		unitTypeId: p
			.uuid("unit_type_id")
			.notNull()
			.references(() => organisationalUnitTypes.id),
	},
	(t) => [p.unique().on(t.roleTypeId, t.unitTypeId)],
);
