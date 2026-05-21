import { isNonEmptyString, unique } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/lib/db";

type AuditLogClient = Database | Transaction;

export type AuditLogAction = (typeof schema.auditLogActionEnum)[number];

export interface RecordAuditEventInput {
	actorUserId?: string | null;
	action: AuditLogAction;
	subjectType: string;
	subjectId: string;
	summary?: Record<string, unknown>;
}

export async function recordAuditEvent(
	client: AuditLogClient,
	input: RecordAuditEventInput,
): Promise<void> {
	const { action, actorUserId = null, subjectId, subjectType, summary = {} } = input;

	await client.insert(schema.auditLogs).values({
		action,
		actorUserId,
		subjectId,
		subjectType,
		summary,
	});
}

const sensitiveFieldNames = new Set([
	"password",
	"passwordConfirmation",
	"currentPassword",
	"newPassword",
	"confirmPassword",
	"twoFactorTotpKey",
	"twoFactorRecoveryCode",
]);

const subjectIdFieldNames = ["id", "documentId", "entityId", "campaignId", "slug", "code"] as const;

export function getAuditSummaryFromFormData(formData: FormData): Record<string, unknown> {
	const fields = unique(Array.from(formData.keys()))
		.filter((field) => !sensitiveFieldNames.has(field))
		.toSorted();
	const intent = formData.get("intent");

	return {
		fields,
		...(isNonEmptyString(intent) ? { intent } : {}),
	};
}

export function getAuditSubjectIdFromFormData(formData: FormData): string {
	for (const field of subjectIdFieldNames) {
		const value = formData.get(field);

		if (typeof value === "string" && value !== "") {
			return value;
		}
	}

	return "unknown";
}
