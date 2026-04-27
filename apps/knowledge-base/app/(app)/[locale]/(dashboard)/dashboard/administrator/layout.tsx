import type { ReactNode } from "react";

import { assertAdmin } from "@/lib/auth/session";

interface DashboardAdministratorLayoutProps {
	children: ReactNode;
}

export default async function DashboardAdministratorLayout(
	props: Readonly<DashboardAdministratorLayoutProps>,
): Promise<ReactNode> {
	const { children } = props;

	await assertAdmin();

	return children;
}
