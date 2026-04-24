import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { organisationalUnits } from "./organisational-units";

export const reportingCampaignStatusEnum = ["open", "closed"] as const;

export const reportingCampaigns = p.pgTable(
	"reporting_campaigns",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		year: p.integer("year").notNull().unique(),
		status: p.text("status", { enum: reportingCampaignStatusEnum }).notNull().default("open"),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.check(
				"reporting_campaigns_status_enum_check",
				inArray(t.status, reportingCampaignStatusEnum),
			),
		];
	},
);

export type ReportingCampaign = typeof reportingCampaigns.$inferSelect;
export type ReportingCampaignInput = typeof reportingCampaigns.$inferInsert;

export const ReportingCampaignSelectSchema = createSelectSchema(reportingCampaigns);
export const ReportingCampaignInsertSchema = createInsertSchema(reportingCampaigns);
export const ReportingCampaignUpdateSchema = createUpdateSchema(reportingCampaigns);

export const reportStatusEnum = ["draft", "submitted", "accepted"] as const;

export const countryReports = p.pgTable(
	"country_reports",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		campaignId: p
			.uuid("campaign_id")
			.notNull()
			.references(() => {
				return reportingCampaigns.id;
			}),
		countryId: p
			.uuid("country_id")
			.notNull()
			.references(() => {
				return organisationalUnits.id;
			}),
		status: p.text("status", { enum: reportStatusEnum }).notNull().default("draft"),
		...f.timestamps(),
	},
	(t) => {
		return [
			p.unique("country_reports_campaign_id_country_id_unique").on(t.campaignId, t.countryId),
			p.check("country_reports_status_enum_check", inArray(t.status, reportStatusEnum)),
		];
	},
);

export type CountryReport = typeof countryReports.$inferSelect;
export type CountryReportInput = typeof countryReports.$inferInsert;

export const CountryReportSelectSchema = createSelectSchema(countryReports);
export const CountryReportInsertSchema = createInsertSchema(countryReports);
export const CountryReportUpdateSchema = createUpdateSchema(countryReports);

export const workingGroupReports = p.pgTable(
	"working_group_reports",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		campaignId: p
			.uuid("campaign_id")
			.notNull()
			.references(() => {
				return reportingCampaigns.id;
			}),
		workingGroupId: p
			.uuid("working_group_id")
			.notNull()
			.references(() => {
				return organisationalUnits.id;
			}),
		status: p.text("status", { enum: reportStatusEnum }).notNull().default("draft"),
		...f.timestamps(),
	},
	(t) => {
		return [
			p
				.unique("working_group_reports_campaign_id_working_group_id_unique")
				.on(t.campaignId, t.workingGroupId),
			p.check("working_group_reports_status_enum_check", inArray(t.status, reportStatusEnum)),
		];
	},
);

export type WorkingGroupReport = typeof workingGroupReports.$inferSelect;
export type WorkingGroupReportInput = typeof workingGroupReports.$inferInsert;

export const WorkingGroupReportSelectSchema = createSelectSchema(workingGroupReports);
export const WorkingGroupReportInsertSchema = createInsertSchema(workingGroupReports);
export const WorkingGroupReportUpdateSchema = createUpdateSchema(workingGroupReports);
