import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { UsersPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_components/users-page";
import { assertAuthenticated } from "@/lib/auth/session";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorUsersPageProps extends PageProps<"/[locale]/dashboard/administrator/users"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorUsersPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Users"),
	});

	return metadata;
}

export default async function DashboardAdministratorUsersPage(
	_props: Readonly<DashboardAdministratorUsersPageProps>,
): Promise<ReactNode> {
	const { user: currentUser } = await assertAuthenticated();

	const users = db.query.users.findMany({
		orderBy: { name: "asc" },
		columns: {
			id: true,
			name: true,
			email: true,
			role: true,
			isEmailVerified: true,
		},
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<UsersPage currentUserId={currentUser.id} users={users} />
		</Suspense>
	);
}
