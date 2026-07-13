import {
	type PairedRelationCheckResult,
	type PairedRelationFinding,
	type PairedRelationFindingKind,
	type RelationInterval,
	type RelationSide,
	checkPairedRelations,
} from "@dariah-eric/database/integrity-service";

import { db } from "@/lib/db";

export type {
	PairedRelationCheckResult,
	PairedRelationFinding,
	PairedRelationFindingKind,
	RelationInterval,
	RelationSide,
};

/**
 * Runs the paired-relation data-integrity checks (e.g. a national representative role and the
 * matching General Assembly membership must both exist with the same duration). Checked in both
 * directions. Same checks as the `@dariah-eric/audit` cli scripts.
 */
export async function getDataIntegrityFindings(): Promise<PairedRelationCheckResult> {
	return checkPairedRelations(db);
}
