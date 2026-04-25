import { inArray } from "drizzle-orm";
import * as p from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-valibot";

import * as f from "../fields";
import { uuidv7 } from "../functions";
import { organisationalUnits } from "./organisational-units";
import { personsToOrganisationalUnits } from "./persons";
import { projects } from "./projects";
import { services } from "./services";
import { socialMedia } from "./social-media";

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
		totalContributors: p.integer("total_contributors"),
		smallEvents: p.integer("small_events"),
		mediumEvents: p.integer("medium_events"),
		largeEvents: p.integer("large_events"),
		dariahCommissionedEvent: p.text("dariah_commissioned_event"),
		reusableOutcomes: p.text("reusable_outcomes"),
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

export const countryReportContributions = p.pgTable(
	"country_report_contributions",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		countryReportId: p
			.uuid("country_report_id")
			.notNull()
			.references(() => {
				return countryReports.id;
			}),
		personToOrgUnitId: p
			.uuid("person_to_org_unit_id")
			.notNull()
			.references(() => {
				return personsToOrganisationalUnits.id;
			}),
	},
	(t) => {
		return [p.unique().on(t.countryReportId, t.personToOrgUnitId)];
	},
);

export type CountryReportContribution = typeof countryReportContributions.$inferSelect;
export type CountryReportContributionInput = typeof countryReportContributions.$inferInsert;

export const CountryReportContributionSelectSchema = createSelectSchema(countryReportContributions);
export const CountryReportContributionInsertSchema = createInsertSchema(countryReportContributions);
export const CountryReportContributionUpdateSchema = createUpdateSchema(countryReportContributions);

export const socialMediaKpiCategoryEnum = [
	"engagement",
	"followers",
	"impressions",
	"mentions",
	"new_content",
	"page_views",
	"posts",
	"reach",
	"subscribers",
	"unique_visitors",
	"views",
	"watch_time",
] as const;

export const countryReportSocialMediaKpis = p.pgTable(
	"country_report_social_media_kpis",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		countryReportId: p
			.uuid("country_report_id")
			.notNull()
			.references(() => {
				return countryReports.id;
			}),
		socialMediaId: p
			.uuid("social_media_id")
			.notNull()
			.references(() => {
				return socialMedia.id;
			}),
		kpi: p.text("kpi", { enum: socialMediaKpiCategoryEnum }).notNull(),
		value: p.integer("value").notNull(),
	},
	(t) => {
		return [
			p.unique().on(t.countryReportId, t.socialMediaId, t.kpi),
			p.check(
				"country_report_social_media_kpis_kpi_enum_check",
				inArray(t.kpi, socialMediaKpiCategoryEnum),
			),
		];
	},
);

export type CountryReportSocialMediaKpi = typeof countryReportSocialMediaKpis.$inferSelect;
export type CountryReportSocialMediaKpiInput = typeof countryReportSocialMediaKpis.$inferInsert;

export const CountryReportSocialMediaKpiSelectSchema = createSelectSchema(
	countryReportSocialMediaKpis,
);
export const CountryReportSocialMediaKpiInsertSchema = createInsertSchema(
	countryReportSocialMediaKpis,
);
export const CountryReportSocialMediaKpiUpdateSchema = createUpdateSchema(
	countryReportSocialMediaKpis,
);

export const serviceKpiCategoryEnum = [
	"downloads",
	"hits",
	"items",
	"jobs_processed",
	"page_views",
	"registered_users",
	"searches",
	"sessions",
	"unique_users",
	"visits",
	"websites_hosted",
] as const;

export const countryReportServiceKpis = p.pgTable(
	"country_report_service_kpis",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		countryReportId: p
			.uuid("country_report_id")
			.notNull()
			.references(() => {
				return countryReports.id;
			}),
		serviceId: p
			.uuid("service_id")
			.notNull()
			.references(() => {
				return services.id;
			}),
		kpi: p.text("kpi", { enum: serviceKpiCategoryEnum }).notNull(),
		value: p.integer("value").notNull(),
	},
	(t) => {
		return [
			p.unique().on(t.countryReportId, t.serviceId, t.kpi),
			p.check("country_report_service_kpis_kpi_enum_check", inArray(t.kpi, serviceKpiCategoryEnum)),
		];
	},
);

export type CountryReportServiceKpi = typeof countryReportServiceKpis.$inferSelect;
export type CountryReportServiceKpiInput = typeof countryReportServiceKpis.$inferInsert;

export const CountryReportServiceKpiSelectSchema = createSelectSchema(countryReportServiceKpis);
export const CountryReportServiceKpiInsertSchema = createInsertSchema(countryReportServiceKpis);
export const CountryReportServiceKpiUpdateSchema = createUpdateSchema(countryReportServiceKpis);

export const countryReportProjectContributions = p.pgTable(
	"country_report_project_contributions",
	{
		id: p.uuid("id").primaryKey().default(uuidv7()),
		countryReportId: p
			.uuid("country_report_id")
			.notNull()
			.references(() => {
				return countryReports.id;
			}),
		projectId: p
			.uuid("project_id")
			.notNull()
			.references(() => {
				return projects.id;
			}),
		amountEuros: p.numeric("amount_euros", { mode: "number", precision: 12, scale: 2 }).notNull(),
	},
	(t) => {
		return [p.unique().on(t.countryReportId, t.projectId)];
	},
);

export type CountryReportProjectContribution =
	typeof countryReportProjectContributions.$inferSelect;
export type CountryReportProjectContributionInput =
	typeof countryReportProjectContributions.$inferInsert;

export const CountryReportProjectContributionSelectSchema = createSelectSchema(
	countryReportProjectContributions,
);
export const CountryReportProjectContributionInsertSchema = createInsertSchema(
	countryReportProjectContributions,
);
export const CountryReportProjectContributionUpdateSchema = createUpdateSchema(
	countryReportProjectContributions,
);
