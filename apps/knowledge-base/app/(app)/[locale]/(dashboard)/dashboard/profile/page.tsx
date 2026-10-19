import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted, getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import {
	Header,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { getEditablePerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_lib/get-editable-person";
import { ProfileForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/profile/_components/profile-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { getCurrentRelationsOfPerson } from "@/lib/data/person-relations";
import { db } from "@/lib/db";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface ProfilePageProps extends PageProps<"/[locale]/dashboard/profile"> {}

export async function generateMetadata(
	_props: Readonly<ProfilePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, { title: t("Your profile") });
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

export default async function ProfilePage(_props: Readonly<ProfilePageProps>): Promise<ReactNode> {
	const { user } = await assertAuthenticated();

	const { personDocumentId } = user;

	if (personDocumentId == null) {
		notFound();
	}

	// Admins edit people in full, including publishing and the slug, so they edit their own person
	// where they edit everyone else's rather than in this draft-only form.
	if (user.role === "admin") {
		const entity = await db.query.entities.findFirst({
			where: { id: personDocumentId },
			columns: { slug: true },
		});

		if (entity == null) {
			notFound();
		}

		redirect({
			href: `/dashboard/administrator/persons/${entity.slug}/edit`,
			locale: await getLocale(),
		});
	}

	const [person, lifecycle, relations, { items: initialAssets }, t] = await Promise.all([
		getEditablePerson(personDocumentId),
		db.transaction((tx) => getDocumentLifecycleState(tx, personDocumentId)),
		getCurrentRelationsOfPerson(personDocumentId),
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "avatars" }),
		getExtracted(),
	]);

	if (person == null) {
		notFound();
	}

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Your profile")}</HeaderTitle>
					<HeaderDescription>
						{t(
							"Edit the details of your person record. Changes are published after review by the DARIAH office.",
						)}
					</HeaderDescription>
				</HeaderContent>
			</Header>

			<div className="mbs-8 flex flex-col gap-y-8">
				{lifecycle.hasDraftChanges ? (
					<p className="rounded-lg border bg-muted px-4 py-3 text-sm">
						{t(
							"Some of your changes are waiting for review. The form shows them, but they are not public yet.",
						)}
					</p>
				) : null}

				<section className="flex flex-col gap-y-2">
					<h2 className="text-sm font-semibold text-fg">{t("Your roles")}</h2>
					{relations.length > 0 ? (
						<ul className="divide-y rounded-lg border">
							{relations.map((relation) => (
								<li key={relation.id} className="flex flex-col gap-y-0.5 px-4 py-3">
									<span className="text-sm font-medium">{relation.unitName}</span>
									<span className="text-xs text-muted-fg capitalize">
										{formatRoleType(relation.roleType)}
									</span>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-fg">{t("You have no current roles.")}</p>
					)}
					<p className="text-xs text-muted-fg">
						{t("To change your roles, contact your national coordinator or the DARIAH office.")}
					</p>
				</section>

				<ProfileForm initialAssets={initialAssets} person={person} />
			</div>
		</Fragment>
	);
}
