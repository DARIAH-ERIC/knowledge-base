import { isNonEmptyString } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/lib/db";

type AuditLogClient = Database | Transaction;

export type AuditLogAction = (typeof schema.auditLogActionEnum)[number];

export interface RecordAuditEventInput {
	actorUserId?: string | null;
	action: AuditLogAction;
	subjectType: string;
	subjectId: string;
	/**
	 * Optional snapshot of the subject's human-readable label. Pass this for events whose subject
	 * won't be resolvable at read time — above all deletes, where the live row is gone by the time
	 * the log is displayed. Omit it for events whose label should be resolved live
	 * (create/update/publish), so renames stay reflected. Resolve it with `resolveAuditSubjectLabel`
	 * before the row is removed.
	 */
	subjectLabel?: string | null;
	summary?: Record<string, unknown>;
}

export async function recordAuditEvent(
	client: AuditLogClient,
	input: RecordAuditEventInput,
): Promise<void> {
	const {
		action,
		actorUserId = null,
		subjectId,
		subjectType,
		subjectLabel = null,
		summary = {},
	} = input;

	await client.insert(schema.auditLogs).values({
		action,
		actorUserId,
		subjectId,
		subjectType,
		subjectLabel,
		summary,
	});
}

/**
 * Derives the form-supplied part of an audit summary. Deliberately does NOT list the submitted
 * field names: every submit posts the whole form, so a field list is a constant that reads like a
 * changeset without being one. We only carry `intent` (which submit button / sub-action was used);
 * the meaningful "what happened" signal (e.g. `lifecycle: draft | published`) is added by each
 * action via its own `auditSummary`. See `formatAuditSummary` for how this is rendered.
 */
export function getAuditSummaryFromFormData(formData: FormData): Record<string, unknown> {
	const intent = formData.get("intent");
	return isNonEmptyString(intent) ? { intent } : {};
}
