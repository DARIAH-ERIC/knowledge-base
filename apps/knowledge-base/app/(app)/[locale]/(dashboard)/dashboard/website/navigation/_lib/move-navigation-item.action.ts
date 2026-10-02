"use server";

import * as schema from "@dariah-eric/database/schema";

import { and, eq, isNull } from "@/lib/db/sql";
import { createCommandAction } from "@/lib/server/create-command-action";
import { UserFacingError } from "@/lib/user-facing-error";
import { dispatchWebhook } from "@/lib/webhook/dispatch-webhook";

export const moveNavigationItemAction = createCommandAction({
	requireAdmin: true,
	audit: { action: "update", subjectType: "navigation" },
	revalidate: "/[locale]/dashboard/website/navigation",

	async mutate(tx, [id, direction]: [string, "up" | "down"]) {
		const item = await tx.query.navigationItems.findFirst({
			where: { id },
			columns: { id: true, position: true, menuId: true, parentId: true },
		});

		if (item == null) {
			throw new UserFacingError("record-not-found");
		}

		const siblings = await tx
			.select({ id: schema.navigationItems.id, position: schema.navigationItems.position })
			.from(schema.navigationItems)
			.where(
				item.parentId != null
					? eq(schema.navigationItems.parentId, item.parentId)
					: and(
							eq(schema.navigationItems.menuId, item.menuId),
							isNull(schema.navigationItems.parentId),
						),
			)
			.orderBy(schema.navigationItems.position);

		const currentIndex = siblings.findIndex((s) => s.id === id);
		const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (targetIndex < 0 || targetIndex >= siblings.length) {
			return { subjectId: id, auditSummary: { direction } };
		}

		const target = siblings[targetIndex];
		if (target == null) {
			return { subjectId: id, auditSummary: { direction } };
		}

		await tx
			.update(schema.navigationItems)
			.set({ position: target.position })
			.where(eq(schema.navigationItems.id, id));

		await tx
			.update(schema.navigationItems)
			.set({ position: item.position })
			.where(eq(schema.navigationItems.id, target.id));

		return { subjectId: id, auditSummary: { direction } };
	},

	async postCommit() {
		await dispatchWebhook({ tags: ["navigation"] });
	},
});
