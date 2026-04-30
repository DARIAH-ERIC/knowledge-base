"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import {
	canManageAdminAccounts,
	countAdminManagers,
	isRemovingAdminManagementPrivilege,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/admin-management";
import { UpdateUserActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/update-user.schema";
import { auth } from "@/lib/auth";
import { assertAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const updateUserAction = createServerAction(
	async function updateUserAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		const { user: currentUser } = await assertAdmin();

		const result = await v.safeParseAsync(
			UpdateUserActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof UpdateUserActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const { id, name, email, role, personId, organisationalUnitId, canManageAdmins } =
			result.output;
		const canManageAdminsFlag = role === "admin" && canManageAdmins === "true";

		const existing = await db.query.users.findFirst({
			where: { id },
			columns: { email: true, role: true, canManageAdmins: true },
		});

		if (existing == null) {
			return createActionStateError({ message: t("User not found.") });
		}

		const isPrivilegedUser = existing.role === "admin" || role === "admin";

		if (isPrivilegedUser && !canManageAdminAccounts(currentUser)) {
			return createActionStateError({
				message: t("You are not allowed to change admin accounts."),
			});
		}

		if (
			currentUser.id === id &&
			isRemovingAdminManagementPrivilege(existing, {
				role,
				canManageAdmins: canManageAdminsFlag,
			})
		) {
			return createActionStateError({
				message: t("You cannot remove your own ability to manage admin accounts."),
			});
		}

		if (
			isRemovingAdminManagementPrivilege(existing, {
				role,
				canManageAdmins: canManageAdminsFlag,
			}) &&
			(await countAdminManagers()) <= 1
		) {
			return createActionStateError({
				message: t("At least one admin user must be allowed to manage admin accounts."),
			});
		}

		if (
			existing.email.toLowerCase() !== email.toLowerCase() &&
			!(await auth.isEmailAvailable(email))
		) {
			return createActionStateError({ message: t("This email address is already in use.") });
		}

		await db
			.update(schema.users)
			.set({
				name,
				email,
				role,
				canManageAdmins: canManageAdminsFlag,
				personId: personId ?? null,
				organisationalUnitId: organisationalUnitId ?? null,
			})
			.where(eq(schema.users.id, id));

		revalidatePath("/[locale]/dashboard/administrator/users", "layout");

		redirect({ href: "/dashboard/administrator/users", locale });
	},
);
