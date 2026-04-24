import type { ReactNode } from "react";

import { assertAdmin } from "@/lib/auth/session";

interface AdministratorLayoutProps {
	children: ReactNode;
}

export default async function AdministratorLayout(
	props: Readonly<AdministratorLayoutProps>,
): Promise<ReactNode> {
	const { children } = props;

	await assertAdmin();

	return children;
}
