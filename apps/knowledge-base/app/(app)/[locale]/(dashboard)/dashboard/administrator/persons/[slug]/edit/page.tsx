import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PersonEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { getContributionRoleOptions, getPersonContributions } from "@/lib/data/contributions";
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

	const [{ items: initialAssets }, person] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "avatars" }),
		db.query.persons.findFirst({
			where: {
				entity: {
					slug,
				},
			},
			columns: {
				id: true,
				email: true,
				name: true,
				orcid: true,
				position: true,
				sortName: true,
			},
			with: {
				entity: {
					columns: {
						documentId: true,
						slug: true,
					},
					with: {
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

	const [contributions, contributionRoleOptions] = await Promise.all([
		getPersonContributions(person.id),
		getContributionRoleOptions(),
	]);

	const image = {
		...person.image,
		url: images.generateSignedImageUrl({
			key: person.image.key,
			options: imageGridOptions,
		}).url,
	};

	const biographyRows = await db
		.select({ content: schema.richTextContentBlocks.content })
		.from(schema.richTextContentBlocks)
		.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
		.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
		.innerJoin(
			schema.entityTypesFieldsNames,
			eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
		)
		.where(
			and(
				eq(schema.fields.entityId, person.id),
				eq(schema.entityTypesFieldsNames.fieldName, "biography"),
			),
		)
		.limit(1);

	const biography = biographyRows.at(0)?.content;

	return (
		<PersonEditForm
			contributionRoleOptions={contributionRoleOptions}
			contributions={contributions}
			initialAssets={initialAssets}
			person={{ ...person, biography, image }}
		/>
	);
}
