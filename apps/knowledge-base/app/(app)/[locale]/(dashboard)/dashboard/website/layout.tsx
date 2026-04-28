import type { ReactNode } from "react";

import { assertAdminPageAccess } from "@/lib/auth/session";

interface DashboardWebsiteLayoutProps {
	children: ReactNode;
}

export default async function DashboardWebsiteLayout(
	props: Readonly<DashboardWebsiteLayoutProps>,
): Promise<ReactNode> {
	const { children } = props;

	await assertAdminPageAccess();

	return children;
}
