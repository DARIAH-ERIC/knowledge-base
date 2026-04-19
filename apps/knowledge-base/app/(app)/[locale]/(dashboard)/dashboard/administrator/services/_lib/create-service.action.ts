"use server";

import { getFormDataValues } from "@acdh-oeaw/lib";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateError, type ValidationErrors } from "@dariah-eric/next-lib/actions";
import { globalPostRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { revalidatePath } from "next/cache";
import { getExtracted, getLocale } from "next-intl/server";
import * as v from "valibot";

import { CreateServiceActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_lib/create-service.schema";
import { assertAuthenticated } from "@/lib/auth/session";
import { getIntlLanguage } from "@/lib/i18n/locales";
import { redirect } from "@/lib/navigation/navigation";
import { createServerAction } from "@/lib/server/create-server-action";

export const createServiceAction = createServerAction(
	async function createServiceAction(state, formData) {
		const locale = await getLocale();
		const t = await getExtracted();

		if (!(await globalPostRequestRateLimit())) {
			return createActionStateError({ message: t("Too many requests.") });
		}

		await assertAuthenticated();

		const result = await v.safeParseAsync(
			CreateServiceActionInputSchema,
			getFormDataValues(formData),
			{ lang: getIntlLanguage(locale) },
		);

		if (!result.success) {
			const errors = v.flatten<typeof CreateServiceActionInputSchema>(result.issues);

			return createActionStateError({
				message: errors.root ?? t("Invalid or missing fields."),
				validationErrors: errors.nested as unknown as ValidationErrors,
			});
		}

		const {
			name,
			sshocMarketplaceId,
			typeId,
			statusId,
			comment,
			dariahBranding,
			monitoring,
			privateSupplier,
			ownerUnitIds,
			providerUnitIds,
		} = result.output;

		await db.transaction(async (tx) => {
			const [service] = await tx
				.insert(schema.services)
				.values({
					name,
					sshocMarketplaceId,
					typeId,
					statusId,
					comment,
					dariahBranding,
					monitoring,
					privateSupplier,
				})
				.returning({ id: schema.services.id });

			if (service == null) return;

			const ownerRole = await tx.query.organisationalUnitServiceRoles.findFirst({
				where: { role: "service_owner" },
				columns: { id: true },
			});

			const providerRole = await tx.query.organisationalUnitServiceRoles.findFirst({
				where: { role: "service_provider" },
				columns: { id: true },
			});

			const relations: Array<typeof schema.servicesToOrganisationalUnits.$inferInsert> = [];

			if (ownerRole != null) {
				for (const unitId of ownerUnitIds) {
					relations.push({
						serviceId: service.id,
						organisationalUnitId: unitId,
						roleId: ownerRole.id,
					});
				}
			}

			if (providerRole != null) {
				for (const unitId of providerUnitIds) {
					relations.push({
						serviceId: service.id,
						organisationalUnitId: unitId,
						roleId: providerRole.id,
					});
				}
			}

			if (relations.length > 0) {
				await tx.insert(schema.servicesToOrganisationalUnits).values(relations);
			}
		});

		revalidatePath("/[locale]/dashboard/administrator/services", "layout");

		redirect({ href: "/dashboard/administrator/services", locale });
	},
);
