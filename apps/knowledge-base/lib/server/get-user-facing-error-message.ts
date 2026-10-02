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

/** Returns a safe message for a recognised error, or null for unexpected failures. */
export function getUserFacingErrorMessage(error: unknown, messages: ErrorMessages): string | null {
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
