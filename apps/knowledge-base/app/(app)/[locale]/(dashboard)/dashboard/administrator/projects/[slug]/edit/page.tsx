import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditProjectPageProps extends PageProps<"/[locale]/dashboard/administrator/projects/[slug]/edit"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditProjectPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit project"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditProjectPage(
	props: Readonly<DashboardAdministratorEditProjectPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const [{ items: assets }, project] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions }),
		db.query.projects.findFirst({
			where: {
				entity: {
					slug,
				},
			},
			columns: {
				acronym: true,
				call: true,
				duration: true,
				funders: true,
				funding: true,
				id: true,
				name: true,
				// metadata: true,
				summary: true,
				topic: true,
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
					},
				},
				scope: {
					columns: {
						id: true,
						scope: true,
					},
				},
			},
		}),
	]);

	if (project == null) {
		notFound();
	}

	const image =
		project.image != null
			? {
					key: project.image.key,
					url: images.generateSignedImageUrl({
						key: project.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	const descriptionRows = await db
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
				eq(schema.fields.entityId, project.id),
				eq(schema.entityTypesFieldsNames.fieldName, "description"),
			),
		)
		.limit(1);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

	const scopes = await db.query.projectScopes.findMany({
		orderBy: {
			scope: "asc",
		},
		columns: {
			id: true,
			scope: true,
		},
	});

	return (
		<ProjectEditForm assets={assets} project={{ ...project, description, image }} scopes={scopes} />
	);
}
