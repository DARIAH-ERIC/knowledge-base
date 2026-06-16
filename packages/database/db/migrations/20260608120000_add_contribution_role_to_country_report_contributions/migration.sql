ALTER TABLE "country_report_contributions" ADD COLUMN IF NOT EXISTS "contribution_role" text;
--> statement-breakpoint
ALTER TABLE "country_report_contributions" DROP CONSTRAINT IF EXISTS "country_report_contributions_contribution_role_enum_check";
--> statement-breakpoint
ALTER TABLE "country_report_contributions" ADD CONSTRAINT "country_report_contributions_contribution_role_enum_check" CHECK ("contribution_role" in ('national_coordinator', 'national_coordinator_deputy', 'is_chair_of_jrc', 'is_chair_of_ncc', 'is_chair_of_wg', 'is_member_of_jrc'));
