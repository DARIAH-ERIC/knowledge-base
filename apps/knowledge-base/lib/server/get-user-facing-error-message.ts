import { getUserFacingDatabaseError } from "@/lib/db/errors";

interface ErrorMessages {
	entitySlugConflict: string;
	invalidData: string;
	missingData: string;
	missingRelatedRecord: string;
	recordConflict: string;
	uniqueConflict: string;
}

/** Returns a safe message for a recognised error, or null for unexpected failures. */
export function getUserFacingErrorMessage(error: unknown, messages: ErrorMessages): string | null {
	switch (getUserFacingDatabaseError(error)) {
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
