import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
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
			personId: true,
			organisationalUnitId: true,
		},
	});

	if (user == null) {
		notFound();
	}

	const [person, organisationalUnit] = await Promise.all([
		user.personId != null
			? db
					.select({ id: schema.persons.id, name: schema.persons.name })
					.from(schema.persons)
					.where(eq(schema.persons.id, user.personId))
					.then((rows) => {
						return rows[0] ?? null;
					})
			: null,
		user.organisationalUnitId != null
			? db
					.select({ id: schema.organisationalUnits.id, name: schema.organisationalUnits.name })
					.from(schema.organisationalUnits)
					.where(eq(schema.organisationalUnits.id, user.organisationalUnitId))
					.then((rows) => {
						return rows[0] ?? null;
					})
			: null,
	]);

	return (
		<UserEditForm
			user={{
				...user,
				person: person ?? null,
				organisationalUnit: organisationalUnit ?? null,
			}}
		/>
	);
}
