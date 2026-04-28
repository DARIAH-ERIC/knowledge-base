import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { PersonDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-details";
import { imageGridOptions } from "@/config/assets.config";
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
	const { params } = props;

	const { slug } = await params;

	const person = await db.query.persons.findFirst({
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

	return <PersonDetails person={{ ...person, image }} />;
}
