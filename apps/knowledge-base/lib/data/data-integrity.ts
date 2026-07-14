import {
	type PairedRelationCheckResult,
	type PairedRelationFinding,
	type PairedRelationFindingKind,
	type RelationInterval,
	type RelationSide,
	type UnitRelationRequirementCheckResult,
	type UnitRelationRequirementFinding,
	checkPairedRelations,
	checkUnitRelationRequirements,
} from "@dariah-eric/database/integrity-service";

import { db } from "@/lib/db";

export type {
	PairedRelationCheckResult,
	PairedRelationFinding,
	PairedRelationFindingKind,
	RelationInterval,
	RelationSide,
	UnitRelationRequirementCheckResult,
	UnitRelationRequirementFinding,
};

/**
 * Runs the paired-relation data-integrity checks (e.g. a national representative role and the
 * matching General Assembly membership must both exist with the same duration). Checked in both
 * directions. Same checks as the `@dariah-eric/audit` cli scripts.
 */
export async function getDataIntegrityFindings(): Promise<PairedRelationCheckResult> {
	return checkPairedRelations(db);
}

/**
 * Runs the unit-relation-requirement checks (e.g. every institution that is a partner institution
 * or cooperating partner of DARIAH-EU must also record which country it is located in). Same checks
 * as the `@dariah-eric/audit` cli scripts.
 */
export async function getUnitRelationRequirementFindings(): Promise<UnitRelationRequirementCheckResult> {
	return checkUnitRelationRequirements(db);
}
