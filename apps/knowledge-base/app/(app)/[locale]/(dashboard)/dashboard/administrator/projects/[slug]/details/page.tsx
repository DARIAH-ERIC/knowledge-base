import { and, eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { JSONContent } from "@tiptap/core";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { ProjectDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-details";
import { imageGridOptions } from "@/config/assets.config";
import { images } from "@/lib/images";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorProjectDetailsPageProps extends PageProps<"/[locale]/dashboard/administrator/projects/[slug]/details"> {}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorProjectDetailsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Project details"),
	});

	return metadata;
}

export default async function DashboardAdministratorProjectDetailsPage(
	props: Readonly<DashboardAdministratorProjectDetailsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { slug } = await params;

	const project = await db.query.projects.findFirst({
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
	});

	if (project == null) {
		notFound();
	}

	const [descriptionRows, partners, socialMediaLinks] = await Promise.all([
		db
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
			.limit(1),
		db.query.projectPartners.findMany({
			where: { projectId: project.id },
			columns: { id: true, duration: true },
			with: {
				unit: { columns: { name: true } },
				role: { columns: { role: true } },
			},
		}),
		db.query.projectsToSocialMedia.findMany({
			where: { projectId: project.id },
			columns: {},
			with: {
				socialMedia: {
					columns: { id: true, name: true, url: true },
					with: { type: { columns: { type: true } } },
				},
			},
		}),
	]);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

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

	return (
		<ProjectDetails
			project={{
				...project,
				description: description ?? null,
				image,
				partners: partners.map((p) => {
					return {
						id: p.id,
						unitName: p.unit.name,
						roleName: p.role.role,
						duration: p.duration ?? null,
					};
				}),
				socialMedia: socialMediaLinks.map((link) => {
					return link.socialMedia;
				}),
			}}
		/>
	);
}
