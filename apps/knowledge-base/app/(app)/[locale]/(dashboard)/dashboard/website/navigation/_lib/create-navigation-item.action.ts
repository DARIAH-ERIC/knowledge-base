"use server";

import * as schema from "@dariah-eric/database/schema";

import { CreateNavigationItemActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/navigation/_lib/create-navigation-item.schema";
import { and, eq, isNull } from "@/lib/db/sql";
import { createMutationAction } from "@/lib/server/create-mutation-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const createNavigationItemAction = createMutationAction({
	schema: CreateNavigationItemActionInputSchema,
	requireAdmin: true,
	audit: { action: "create", subjectType: "navigation" },
	revalidate: "/[locale]/dashboard/website/navigation",

	async mutate(tx, input) {
		if (input.parentId != null) {
			// A dropdown holds links: an item without a destination could only open a further level,
			// which the website navigation does not render.
			if (input.href == null && input.entityId == null) {
				throw new UserFacingError("navigation-item-child-without-link");
			}

			const parent = await tx.query.navigationItems.findFirst({
				where: { id: input.parentId },
				columns: { id: true, parentId: true, href: true, entityId: true },
			});

			// Only a top-level item that links nowhere itself is a dropdown trigger; an item that both
			// navigates and opens a submenu has no unambiguous behaviour.
			if (
				parent == null ||
				parent.parentId != null ||
				parent.href != null ||
				parent.entityId != null
			) {
				throw new UserFacingError("navigation-item-invalid-parent");
			}
		}

		const siblings = await tx
			.select({ id: schema.navigationItems.id })
			.from(schema.navigationItems)
			.where(
				input.parentId != null
					? eq(schema.navigationItems.parentId, input.parentId)
					: and(
							eq(schema.navigationItems.menuId, input.menuId),
							isNull(schema.navigationItems.parentId),
						),
			);

		await tx.insert(schema.navigationItems).values({
			menuId: input.menuId,
			parentId: input.parentId ?? null,
			label: input.label,
			href: input.href ?? null,
			entityId: input.entityId ?? null,
			isExternal: input.isExternal ?? false,
			position: siblings.length,
		});

		return { subjectId: input.menuId };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["navigation"] });
	},
});
