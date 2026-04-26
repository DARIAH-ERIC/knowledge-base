import type { ReactNode } from "react";

import { assertAdmin } from "@/lib/auth/session";

interface DashboardWebsiteLayoutProps {
	children: ReactNode;
}

export default async function DashboardWebsiteLayout(
	props: Readonly<DashboardWebsiteLayoutProps>,
): Promise<ReactNode> {
	const { children } = props;

	await assertAdmin();

	return children;
}
