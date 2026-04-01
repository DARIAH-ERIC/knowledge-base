import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { organisationalUnits } from "./organisational-units";
import { socialMedia } from "./social-media";

export const softwareStatusesEnum = ["maintained", "needs_review", "not_maintained"] as const;

export const softwareStatuses = p.pgTable(
	"software_statuses",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		status: p.text("status", { enum: softwareStatusesEnum }).notNull().unique(),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.check("software_statuses_status_enum_check", inArray(t.status, softwareStatusesEnum)),
		];
	},
);

export type SoftwareStatus = typeof softwareStatuses.$inferSelect;
export type SoftwareStatusInput = typeof softwareStatuses.$inferInsert;

export const SoftwareStatusSelectSchema = createSelectSchema(softwareStatuses);
export const SoftwareStatusInsertSchema = createInsertSchema(softwareStatuses);
export const SoftwareStatusUpdateSchema = createUpdateSchema(softwareStatuses);

export const software = p.pgTable("software", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	name: p.text("name").notNull(),
	sshocMarketplaceId: p.text("sshoc_marketplace_id"),
	statusId: p
		.uuid("status_id")
		.notNull()
		.references(() => {
			return softwareStatuses.id;
		}),
	comment: p.text("comment"),
	...f.timestamps(),
});

export type Software = typeof software.$inferSelect;
export type SoftwareInput = typeof software.$inferInsert;

export const SoftwareSelectSchema = createSelectSchema(software);
export const SoftwareInsertSchema = createInsertSchema(software);
export const SoftwareUpdateSchema = createUpdateSchema(software);

export const softwareToOrganisationalUnits = p.pgTable("software_to_organisational_units", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	softwareId: p
		.uuid("software_id")
		.notNull()
		.references(() => {
			return software.id;
		}),
	organisationalUnitId: p
		.uuid("organisational_unit_id")
		.notNull()
		.references(() => {
			return organisationalUnits.id;
		}),
	...f.timestamps(),
});

export type SoftwareToOrganisationalUnit = typeof softwareToOrganisationalUnits.$inferSelect;
export type SoftwareToOrganisationalUnitInput = typeof softwareToOrganisationalUnits.$inferInsert;

export const SoftwareToOrganisationalUnitSelectSchema = createSelectSchema(
	softwareToOrganisationalUnits,
);
export const SoftwareToOrganisationalUnitInsertSchema = createInsertSchema(
	softwareToOrganisationalUnits,
);
export const SoftwareToOrganisationalUnitUpdateSchema = createUpdateSchema(
	softwareToOrganisationalUnits,
);

export const softwareToSocialMedia = p.pgTable("software_to_social_media", {
	id: p.uuid("id").primaryKey().default(uuidv7()),
	softwareId: p
		.uuid("software_id")
		.notNull()
		.references(() => {
			return software.id;
		}),
	socialMediaId: p
		.uuid("social_media_id")
		.notNull()
		.references(() => {
			return socialMedia.id;
		}),
	...f.timestamps(),
});

export type SoftwareToSocialMedia = typeof softwareToSocialMedia.$inferSelect;
export type SoftwareToSocialMediaInput = typeof softwareToSocialMedia.$inferInsert;

export const SoftwareToSocialMediaSelectSchema = createSelectSchema(softwareToSocialMedia);
export const SoftwareToSocialMediaInsertSchema = createInsertSchema(softwareToSocialMedia);
export const SoftwareToSocialMediaUpdateSchema = createUpdateSchema(softwareToSocialMedia);
