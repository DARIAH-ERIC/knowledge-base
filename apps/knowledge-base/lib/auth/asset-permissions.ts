import type { User } from "@dariah-eric/auth";

import { getUserOrganisationalUnitScopes } from "@/lib/data/user-organisational-units";

/**
 * Whether the user may upload to the shared media library: admins, and delegated editors who can
 * edit at least one organisational unit, so they can add images to the entities they manage.
 * Editing or deleting existing assets stays admin-only.
 *
 * Kept apart from `permissions.ts`, which `user-organisational-units.ts` itself depends on.
 */
export async function canUploadAssets(user: User): Promise<boolean> {
	if (user.role === "admin") {
		return true;
	}

	const { countries, workingGroups } = await getUserOrganisationalUnitScopes(user);

	return [...countries, ...workingGroups].some((scope) => scope.canEdit);
}
