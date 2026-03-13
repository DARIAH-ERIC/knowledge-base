import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { organisationalUnits } from "./organisational-units";
import { socialMedia } from "./social-media";

export const serviceTypesEnum = ["community", "core", "internal"] as const;

export const serviceTypes = p.pgTable(
	"service_types",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		type: p.text("type", { enum: serviceTypesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("service_types_type_enum_check", inArray(t.type, serviceTypesEnum))];
	},
);

export type ServiceType = typeof serviceTypes.$inferSelect;
export type ServiceTypeInput = typeof serviceTypes.$inferInsert;

export const ServiceTypeSelectSchema = createSelectSchema(serviceTypes);
export const ServiceTypeInsertSchema = createInsertSchema(serviceTypes);
export const ServiceTypeUpdateSchema = createUpdateSchema(serviceTypes);

export const serviceStatusesEnum = [
	"discontinued",
	"in_preparation",
	"live",
	"needs_review",
	"to_be_discontinued",
] as const;

export const serviceStatuses = p.pgTable(
	"service_statuses",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		status: p.text("status", { enum: serviceStatusesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [p.check("service_statuses_status_enum_check", inArray(t.status, serviceStatusesEnum))];
	},
);

export type ServiceStatus = typeof serviceStatuses.$inferSelect;
export type ServiceStatusInput = typeof serviceStatuses.$inferInsert;

export const ServiceStatusSelectSchema = createSelectSchema(serviceStatuses);
export const ServiceStatusInsertSchema = createInsertSchema(serviceStatuses);
export const ServiceStatusUpdateSchema = createUpdateSchema(serviceStatuses);

export const services = p.pgTable("services", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	name: p.text("name").notNull(),
	sshocMarketplaceId: p.text("sshoc_marketplace_id"),
	typeId: p
		.uuid("type_id")
		.notNull()
		.references(() => {
			return serviceTypes.id;
		}),
	statusId: p
		.uuid("status_id")
		.notNull()
		.references(() => {
			return serviceStatuses.id;
		}),
	...f.timestamps(),

	// FIXME:
	comment: p.text("comment"),
	agreements: p.text("agreements"),
	audience: p.text("audience", {
		enum: ["dariah_team", "global", "national_local"],
	}),
	dariahBranding: p.boolean("dariah_branding"),
	eoscOnboarding: p.boolean("eosc_onboarding"),
	sshocMarketplaceStatus: p.text("sshoc_marketplace_status", {
		enum: ["no", "not_applicable", "yes"],
	}),
	monitoring: p.boolean("monitoring"),
	privateSupplier: p.boolean("private_supplier"),
	technicalContact: p.text("technical_contact"),
	technicalReadinessLevel: p.integer("technical_readiness_level"),
	valueProposition: p.text("value_proposition"),
});

export type Service = typeof services.$inferSelect;
export type ServiceInput = typeof services.$inferInsert;

export const ServiceSelectSchema = createSelectSchema(services);
export const ServiceInsertSchema = createInsertSchema(services);
export const ServiceUpdateSchema = createUpdateSchema(services);

export const servicesToOrganisationalUnits = p.pgTable("services_to_organisational_units", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	serviceId: p
		.uuid("service_id")
		.notNull()
		.references(() => {
			return services.id;
		}),
	organisationalUnitId: p
		.uuid("organisational_unit_id")
		.notNull()
		.references(() => {
			return organisationalUnits.id;
		}),
	...f.timestamps(),
});

export type ServiceToOrganisationalUnit = typeof servicesToOrganisationalUnits.$inferSelect;
export type ServiceToOrganisationalUnitInput = typeof servicesToOrganisationalUnits.$inferInsert;

export const ServiceToOrganisationalUnitSelectSchema = createSelectSchema(
	servicesToOrganisationalUnits,
);
export const ServiceToOrganisationalUnitInsertSchema = createInsertSchema(
	servicesToOrganisationalUnits,
);
export const ServiceToOrganisationalUnitUpdateSchema = createUpdateSchema(
	servicesToOrganisationalUnits,
);

export const servicesToSocialMedia = p.pgTable("services_to_social_media", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	serviceId: p
		.uuid("service_id")
		.notNull()
		.references(() => {
			return services.id;
		}),
	socialMediaId: p
		.uuid("social_media_id")
		.notNull()
		.references(() => {
			return socialMedia.id;
		}),
	...f.timestamps(),
});

export type ServiceToSocialMedia = typeof servicesToSocialMedia.$inferSelect;
export type ServiceToSocialMediaInput = typeof servicesToSocialMedia.$inferInsert;

export const ServiceToSocialMediaSelectSchema = createSelectSchema(servicesToSocialMedia);
export const ServiceToSocialMediaInsertSchema = createInsertSchema(servicesToSocialMedia);
export const ServiceToSocialMediaUpdateSchema = createUpdateSchema(servicesToSocialMedia);
