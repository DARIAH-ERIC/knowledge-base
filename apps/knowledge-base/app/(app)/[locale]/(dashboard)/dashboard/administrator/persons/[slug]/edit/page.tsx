import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PersonEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import {
	annotatePersonContributionLifecycle,
	getContributionRoleOptions,
	getPersonContributions,
} from "@/lib/data/contributions";
import { ensureDraftVersion, getDocumentLifecycleState } from "@/lib/data/entity-lifecycle";
import { personsLifecycleAdapter } from "@/lib/data/persons.lifecycle-adapter";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditPersonPageProps extends PageProps<"/[locale]/dashboard/administrator/persons/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditPersonPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit person"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditPersonPage(
	props: Readonly<DashboardAdministratorEditPersonPageProps>,
): Promise<ReactNode> {
	const { params } = props;

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

	const { draftVersionId, hasDraftChanges, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(tx, documentId, personsLifecycleAdapter);
		const { hasDraftChanges, publishedId } = await getDocumentLifecycleState(tx, documentId);
		return { draftVersionId, hasDraftChanges, publishedId };
	});

	const [{ items: initialAssets }, person] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "avatars" }),
		db.query.persons.findFirst({
			where: { id: draftVersionId },
			columns: {
				id: true,
				email: true,
				name: true,
				orcid: true,
				position: true,
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
		}),
	]);

	if (person == null) {
		notFound();
	}

	const [contributions, contributionRoleOptions, biographyRows, publishedContributions] =
		await Promise.all([
			getPersonContributions(person.id),
			getContributionRoleOptions(),
			db
				.select({ content: schema.richTextContentBlocks.content })
				.from(schema.richTextContentBlocks)
				.innerJoin(
					schema.contentBlocks,
					eq(schema.richTextContentBlocks.id, schema.contentBlocks.id),
				)
				.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
				.innerJoin(
					schema.entityTypesFieldsNames,
					eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
				)
				.where(
					and(
						eq(schema.fields.entityVersionId, person.id),
						eq(schema.entityTypesFieldsNames.fieldName, "biography"),
					),
				)
				.limit(1),
			publishedId != null ? getPersonContributions(publishedId) : Promise.resolve([]),
		]);

	const biography = biographyRows.at(0)?.content;

	const image = {
		...person.image,
		url: images.generateSignedImageUrl({
			key: person.image.key,
			options: imageGridOptions,
		}).url,
	};

	return (
		<PersonEditForm
			contributionRoleOptions={contributionRoleOptions}
			contributions={annotatePersonContributionLifecycle(contributions, publishedContributions)}
			documentId={documentId}
			hasDraftChanges={hasDraftChanges}
			initialAssets={initialAssets}
			isPublished={publishedId != null}
			person={{ ...person, biography, image }}
		/>
	);
}
