import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PersonDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-details";
import { discardPersonDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/discard-person-draft.action";
import { publishPersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/publish-person.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorPersonDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/persons/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorPersonDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Person details"),
	});

	return metadata;
}

export default async function DashboardAdministratorPersonDetailsPage(
	props: Readonly<DashboardAdministratorPersonDetailsPageProps>,
): Promise<ReactNode> {
	const { params, searchParams: searchParamsPromise } = props;

	const { slug } = await params;

	await assertAuthenticated();

	const doc = await db.query.entities.findFirst({
		where: { slug },
		columns: { id: true },
	});

	if (doc == null) {
		notFound();
	}

	const { draftId, publishedId, hasDraftChanges } = await db.transaction(async (tx) =>
		getDocumentLifecycleState(tx, doc.id),
	);

	/**
	 * The version selector and "with draft changes" UX only kick in when the draft actually diverges
	 * from the published version. Right after publish, a draft row still exists as a clone of the new
	 * published version but has no real changes — we treat that as published-only.
	 */
	const showVersionSelector = hasDraftChanges && publishedId != null && draftId != null;

	const { version } = await searchParamsPromise;
	let selectedVersion: "draft" | "published";
	let versionId: string | null;

	if (showVersionSelector) {
		selectedVersion = version === "published" ? "published" : "draft";
		versionId = selectedVersion === "published" ? publishedId : draftId;
	} else if (publishedId != null) {
		selectedVersion = "published";
		versionId = publishedId;
	} else {
		selectedVersion = "draft";
		versionId = draftId;
	}

	if (versionId == null) {
		notFound();
	}

	const person = await db.query.persons.findFirst({
		where: { id: versionId },
		columns: {
			id: true,
			email: true,
			name: true,
			orcid: true,
			sortName: true,
		},
		with: {
			entityVersion: {
				columns: { id: true },
				with: {
					entity: {
						columns: {
							id: true,
							slug: true,
						},
					},
					status: {
						columns: {
							id: true,
							type: true,
						},
					},
				},
			},
			image: {
				columns: {
					key: true,
					label: true,
				},
			},
		},
	});

	if (person == null) {
		notFound();
	}

	const image = {
		...person.image,
		url: images.generateSignedImageUrl({
			key: person.image.key,
			options: imageGridOptions,
		}).url,
	};

	return (
		<PersonDetails
			discardDraftAction={discardPersonDraftAction}
			documentId={doc.id}
			hasDraft={hasDraftChanges}
			isPublished={publishedId != null}
			person={{ ...person, image }}
			publishAction={publishPersonAction}
			selectedVersion={selectedVersion}
		/>
	);
}
