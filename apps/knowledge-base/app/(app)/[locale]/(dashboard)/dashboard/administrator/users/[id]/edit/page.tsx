import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { UserEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_components/user-edit-form";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditUserPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditUserPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit user"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditUserPage(
	props: Readonly<DashboardAdministratorEditUserPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const user = await db.query.users.findFirst({
		where: { id },
		columns: {
			id: true,
			name: true,
			email: true,
			role: true,
		},
	});

	if (user == null) {
		notFound();
	}

	return <UserEditForm user={user} />;
}
