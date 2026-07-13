import {
	type DerivedRelationCheckResult,
	type DerivedRelationFinding,
	type DerivedRelationFindingKind,
	type DerivedRelationInterval,
	checkDerivedRelations,
} from "@dariah-eric/database/integrity-service";

import { db } from "@/lib/db";

export type {
	DerivedRelationCheckResult,
	DerivedRelationFinding,
	DerivedRelationFindingKind,
	DerivedRelationInterval,
};

/**
 * Runs the derived-relation data-integrity checks (e.g. national coordinator roles must be mirrored
 * by a General Assembly membership with matching duration). Same checks as the `@dariah-eric/audit`
 * cli scripts.
 */
export async function getDataIntegrityFindings(): Promise<DerivedRelationCheckResult> {
	return checkDerivedRelations(db);
}
