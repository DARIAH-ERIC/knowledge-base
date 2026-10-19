"use server";

import type { EditablePerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/person-relations-section";
import { assertCanEditPerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_lib/authorize-delegated-person";
import { getEditablePerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_lib/get-editable-person";
import { assertAuthenticated } from "@/lib/auth/session";

/**
 * Loads the person so the delegated edit sheet can prefill the full person form. Authorized the
 * same way as the edit itself. Returns `null` when the person cannot be resolved.
 */
export async function getDelegatedPersonAction(documentId: string): Promise<EditablePerson | null> {
	const { user } = await assertAuthenticated();
	await assertCanEditPerson(user, documentId);

	return getEditablePerson(documentId);
}
