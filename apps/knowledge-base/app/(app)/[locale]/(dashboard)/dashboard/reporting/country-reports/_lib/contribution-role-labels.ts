import { useExtracted } from "next-intl";

import type { CompensationRole } from "@/lib/data/report-contributions";

/**
 * Returns the human label for a compensation role. A hook rather than a helper taking `t`, because
 * the i18n extractor only sees `t(...)` calls on a `useExtracted()` binding in scope.
 */
export function useCompensationRoleLabel(): (role: CompensationRole | null) => string | null {
	const t = useExtracted();

	return function getCompensationRoleLabel(role) {
		switch (role) {
			case "national_coordinator": {
				return t("National coordinator");
			}
			case "national_coordinator_deputy": {
				return t("National coordinator (deputy)");
			}
			case "is_chair_of_jrc": {
				return t("JRC chair");
			}
			case "is_chair_of_ncc": {
				return t("NCC chair");
			}
			case "is_chair_of_wg": {
				return t("Working group chair");
			}
			case "is_member_of_jrc": {
				return t("JRC member");
			}
			case null: {
				return null;
			}
			default: {
				return null;
			}
		}
	};
}
