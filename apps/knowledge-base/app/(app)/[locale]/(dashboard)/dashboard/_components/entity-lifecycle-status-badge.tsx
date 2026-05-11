"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface EntityLifecycleStatusBadgeProps {
	hasDraft: boolean;
	isPublished: boolean;
}

export function EntityLifecycleStatusBadge(
	props: Readonly<EntityLifecycleStatusBadgeProps>,
): ReactNode {
	const { hasDraft, isPublished } = props;
	const t = useExtracted();

	if (hasDraft && isPublished) {
		return <Badge intent="info">{t("Live + Draft")}</Badge>;
	}

	if (hasDraft) {
		return <Badge intent="warning">{t("Draft")}</Badge>;
	}

	return <Badge intent="success">{t("Live")}</Badge>;
}
