"use server";

import * as schema from "@dariah-eric/database/schema";

import { UpdateNavigationItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_lib/update-navigation-item.schema";
import { eq } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const updateNavigationItemAction = createMutationAction({
	schema: UpdateNavigationItemActionInputSchema,
	requireAdmin: true,
	audit: { action: "update", subjectType: "navigation" },
	revalidate: "/[locale]/dashboard/website/navigation",

	async mutate(tx, input) {
		const isLink = input.href != null || input.entityId != null;

		const item = await tx.query.navigationItems.findFirst({
			where: { id: input.id },
			columns: { id: true, parentId: true },
			with: { children: { columns: { id: true }, limit: 1 } },
		});

		if (item == null) {
			throw new UserFacingError("navigation-item-invalid-parent");
		}

		// The same rule as when items are created, applied to the edit that would break it: a dropdown
		// trigger cannot gain a destination, and an item inside a dropdown cannot lose one.
		if (isLink && item.children.length > 0) {
			throw new UserFacingError("navigation-item-link-with-children");
		}

		if (!isLink && item.parentId != null) {
			throw new UserFacingError("navigation-item-child-without-link");
		}

		await tx
			.update(schema.navigationItems)
			.set({
				label: input.label,
				href: input.href ?? null,
				entityId: input.entityId ?? null,
				isExternal: input.isExternal ?? false,
			})
			.where(eq(schema.navigationItems.id, input.id));

		return { subjectId: input.id };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["navigation"] });
	},
});
