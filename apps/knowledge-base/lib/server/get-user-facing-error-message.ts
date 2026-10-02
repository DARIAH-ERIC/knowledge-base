import { getExtracted } from "next-intl/server";

import { getUserFacingDatabaseError } from "@/lib/db/errors";
import { findUserFacingError } from "@/lib/user-facing-error";

interface ErrorMessages {
	sshocServiceDeletion: string;
	ownAccountDeletion: string;
	lastAdminManager: string;
	adminAccountDeletionNotAllowed: string;
	referencedByReport: string;
	documentLinkedToUser: string;
	entityLinkedFromNavigation: string;
	entitySlugConflict: string;
	frozenReportRoleConflict: string;
	invalidData: string;
	missingDariahEric: string;
	missingData: string;
	missingPairedRelationUnit: string;
	missingRelatedRecord: string;
	navigationItemChildWithoutLink: string;
	navigationItemInvalidParent: string;
	navigationItemLinkWithChildren: string;
	publishedSlugRename: string;
	recordNotFound: string;
	recordConflict: string;
	relationEndBeforeStart: string;
	relationNotEndable: string;
	relationPeriodOverlap: string;
	serviceKpiConflict: string;
	slugTooLong: string;
	socialMediaKpiConflict: string;
	uniqueConflict: string;
}

interface GetUserFacingErrorMessageOptions {
	/** The failed action deletes a record. */
	isDelete?: boolean;
}

/**
 * Returns a safe, translated message for a recognised error, or null for unexpected failures.
 *
 * Shared by every action wrapper, so a new error kind only needs a message here. `t` is bound in
 * this function rather than passed in, because the i18n extractor only sees `t(...)` calls on a
 * `getExtracted()` binding in scope.
 */
export async function getUserFacingErrorMessage(
	error: unknown,
	options: GetUserFacingErrorMessageOptions = {},
): Promise<string | null> {
	const messages = await getErrorMessages(options);

	// A deliberately raised application error wins over the database-error inference: it carries the
	// precise reason, whereas the driver-code path can only guess from a generic constraint failure.
	const appError = findUserFacingError(error);
	if (appError != null) {
		switch (appError.kind) {
			case "sshoc-service-deletion": {
				return messages.sshocServiceDeletion;
			}
			case "own-account-deletion": {
				return messages.ownAccountDeletion;
			}
			case "last-admin-manager": {
				return messages.lastAdminManager;
			}
			case "admin-account-deletion-not-allowed": {
				return messages.adminAccountDeletionNotAllowed;
			}
			case "referenced-by-report": {
				return messages.referencedByReport;
			}
			case "document-linked-to-user": {
				return messages.documentLinkedToUser;
			}
			case "frozen-report-role-conflict": {
				return messages.frozenReportRoleConflict;
			}
			case "missing-dariah-eric": {
				return messages.missingDariahEric;
			}
			case "missing-paired-relation-unit": {
				return messages.missingPairedRelationUnit;
			}
			case "navigation-item-child-without-link": {
				return messages.navigationItemChildWithoutLink;
			}
			case "navigation-item-invalid-parent": {
				return messages.navigationItemInvalidParent;
			}
			case "navigation-item-link-with-children": {
				return messages.navigationItemLinkWithChildren;
			}
			case "published-slug-rename": {
				return messages.publishedSlugRename;
			}
			case "record-not-found": {
				return messages.recordNotFound;
			}
			case "relation-end-before-start": {
				return messages.relationEndBeforeStart;
			}
			case "relation-not-endable": {
				return messages.relationNotEndable;
			}
			case "relation-period-overlap": {
				return messages.relationPeriodOverlap;
			}
			case "service-kpi-conflict": {
				return messages.serviceKpiConflict;
			}
			case "slug-too-long": {
				return messages.slugTooLong;
			}
			case "social-media-kpi-conflict": {
				return messages.socialMediaKpiConflict;
			}
		}
	}

	switch (getUserFacingDatabaseError(error)) {
		case "entity-linked-from-navigation": {
			return messages.entityLinkedFromNavigation;
		}
		case "entity-slug-conflict": {
			return messages.entitySlugConflict;
		}
		case "unique-conflict": {
			return messages.uniqueConflict;
		}
		case "missing-related-record": {
			return messages.missingRelatedRecord;
		}
		case "record-conflict": {
			return messages.recordConflict;
		}
		case "invalid-data": {
			return messages.invalidData;
		}
		case "missing-data": {
			return messages.missingData;
		}
		case null: {
			return null;
		}
	}
}

async function getErrorMessages(options: GetUserFacingErrorMessageOptions): Promise<ErrorMessages> {
	const { isDelete = false } = options;

	const t = await getExtracted();

	return {
		referencedByReport: t(
			"A country or working group report refers to this record, so it cannot be deleted. Deleting it would change the report.",
		),
		adminAccountDeletionNotAllowed: t("You are not allowed to delete admin accounts."),
		lastAdminManager: t("At least one admin user must be allowed to manage admin accounts."),
		ownAccountDeletion: t("You cannot delete your own account."),
		sshocServiceDeletion: t(
			"This service is imported from the SSHOC Marketplace and cannot be deleted here.",
		),
		documentLinkedToUser: t(
			"A user account is linked to this record. Update that user's linked person or country before deleting it.",
		),
		entityLinkedFromNavigation: t(
			"This record is linked from a navigation menu. Remove the navigation link before deleting it.",
		),
		entitySlugConflict: t("An entity with this slug already exists."),
		frozenReportRoleConflict: t(
			"Both records are listed in the same report with different roles. Make the roles in that report match, then merge.",
		),
		uniqueConflict: t("A record with these values already exists."),
		missingDariahEric: t(
			"The DARIAH-EU organisational unit could not be found, so this relation cannot be recorded.",
		),
		missingPairedRelationUnit: t(
			"The governance body this role must also be recorded against could not be found.",
		),
		relationPeriodOverlap: t(
			"This relation already exists during an overlapping period. Adjust the dates and try again.",
		),
		relationEndBeforeStart: t("The end date must be on or after the start of the relation."),
		relationNotEndable: t(
			"This relation is not one this form can end, or it has already been ended. Refresh the page and try again.",
		),
		// On a delete, a foreign-key violation means other records still point at this one.
		missingRelatedRecord: isDelete
			? t("Other records still refer to this record, so it cannot be deleted.")
			: t("A related record no longer exists. Refresh the page and try again."),
		navigationItemChildWithoutLink: t("An item inside a dropdown must link to a page or a url."),
		navigationItemInvalidParent: t(
			"Child items can only be added to a top-level item that does not link anywhere itself.",
		),
		navigationItemLinkWithChildren: t(
			"This item opens a dropdown, so it cannot link anywhere itself. Remove its child items first.",
		),
		publishedSlugRename: t(
			"This entity is published, so its address can only be changed by an administrator on the Maintenance page.",
		),
		recordNotFound: t("This record no longer exists. Refresh the page and try again."),
		recordConflict: t("This record conflicts with an existing record."),
		serviceKpiConflict: t(
			"Both services have a value for the same KPI in the same country report. Remove the duplicate KPIs from that report, then merge.",
		),
		slugTooLong: t("This slug is too long to be used as a web address. Please shorten it."),
		socialMediaKpiConflict: t(
			"Both accounts have a value for the same KPI in the same country report. Remove the duplicate KPIs from that report, then merge.",
		),
		invalidData: t("The submitted data violates a data rule."),
		missingData: t("The submitted data is incomplete."),
	};
}
