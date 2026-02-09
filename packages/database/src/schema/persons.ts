import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { assets } from "./assets";
import { entities } from "./entities";
import { organisationalUnits, organisationalUnitTypes } from "./organisational-units";

export const personRoleTypesEnum = [
	"dco_member",
	"director",
	"national_coordinator",
	"national_coordinator_deputy",
	"national_representative",
	"national_representative_deputy",
	"jrc_chair",
	"jrc_member",
	"scientific_board_member",
	"smt_member",
	"wg_chair",
	"wg_member",
	"national_consortium_contact",
	"cooperating_partner_contact",
	"ncc_chair",
] as const;

export const persons = p.pgTable("persons", {
	id: p
		.uuid("id")
		.primaryKey()
		.references(() => {
			return entities.id;
		}),
	name: p.text("name").notNull(),
	sortName: p.text("sort_name").notNull(),
	description: p.text("description").notNull(),
	imageId: p
		.uuid("image_id")
		.notNull()
		.references(() => {
			return assets.id;
		}),
	...f.timestamps(),
});

export type Person = typeof persons.$inferSelect;
export type PersonInput = typeof persons.$inferInsert;

export const PersonSelectSchema = createSelectSchema(persons);
export const PersonInsertSchema = createInsertSchema(persons);
export const PersonUpdateSchema = createUpdateSchema(persons);

export const personRoleTypes = p.pgTable(
	"person_role_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("type", { enum: personRoleTypesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("person_role_types_type_enum_check", inArray(t.type, personRoleTypesEnum))];
	},
);

export const personsToOrganisationalUnits = p.pgTable("persons_to_organisational_units", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	personId: p
		.uuid("person_id")
		.notNull()
		.references(() => {
			return persons.id;
		}),
	organisationalUnitId: p
		.uuid("organisational_unit_id")
		.notNull()
		.references(() => {
			return organisationalUnits.id;
		}),
	roleTypeId: p
		.uuid("role_type_id")
		.notNull()
		.references(() => {
			return personRoleTypes.id;
		}),
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

export const personRoleTypesToOrganisationalUnitTypesAllowedRelations = p.pgTable(
	"person_role_types_to_organisational_unit_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		roleTypeId: p
			.uuid("role_type_id")
			.notNull()
			.references(() => {
				return personRoleTypes.id;
			}),
		unitTypeId: p
			.uuid("unit_type_id")
			.notNull()
			.references(() => {
				return organisationalUnitTypes.id;
			}),
	},
	(t) => {
		return [p.unique().on(t.roleTypeId, t.unitTypeId)];
	},
);
