import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PersonDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-details";
import { discardPersonDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/discard-person-draft.action";
import { publishPersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_lib/publish-person.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getResolvedEntityContentBlocks } from "@/lib/content-blocks-service";
import { getPersonArticles } from "@/lib/data/article-contributors";
import { getPersonContributions } from "@/lib/data/contributions";
import { resolveSelectedDetailVersion } from "@/lib/data/entity-detail-view";
import { getPersonSocialMedia } from "@/lib/data/person-social-media";
import {
	selectedImageColumns,
	selectedImageWith,
	toSelectedImage,
} from "@/lib/data/selected-image";
import { db } from "@/lib/db";
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

	const anyVersion = await db.query.persons.findFirst({
		where: { entityVersion: { entity: { slug } } },
		columns: {},
		with: {
			entityVersion: {
				columns: {},
				with: { entity: { columns: { id: true } } },
			},
		},
	});

	if (anyVersion == null) {
		notFound();
	}

	const documentId = anyVersion.entityVersion.entity.id;

	const { version } = await searchParamsPromise;

	const versionState = await resolveSelectedDetailVersion(documentId, version);
	if (versionState == null) {
		notFound();
	}
	const { hasDraftChanges, publishedId, selectedVersion, versionId } = versionState;

	const person = await db.query.persons.findFirst({
		where: { id: versionId },
		columns: {
			imageCaption: true,
			imageCaptionMode: true,
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
				columns: selectedImageColumns,
				with: selectedImageWith,
			},
		},
	});

	if (person == null) {
		notFound();
	}

	const [contributions, articles, biographyContentBlocks, socialMedia] = await Promise.all([
		getPersonContributions(documentId),
		getPersonArticles(documentId),
		getResolvedEntityContentBlocks(versionId, "biography"),
		getPersonSocialMedia(db, versionId),
	]);

	const image = person.image != null ? toSelectedImage(person.image, imageGridOptions) : null;

	return (
		<PersonDetails
			articles={articles}
			contributions={contributions}
			discardDraftAction={discardPersonDraftAction}
			documentId={documentId}
			hasDraft={hasDraftChanges}
			isPublished={publishedId != null}
			socialMedia={socialMedia}
			person={{ ...person, biographyContentBlocks, image }}
			publishAction={publishPersonAction}
			selectedVersion={selectedVersion}
		/>
	);
}
