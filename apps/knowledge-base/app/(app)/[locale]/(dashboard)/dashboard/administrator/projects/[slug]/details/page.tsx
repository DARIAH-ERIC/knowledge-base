import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ProjectDetails } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-details";
import { discardProjectDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/discard-project-draft.action";
import { publishProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/publish-project.action";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getDocumentVersions } from "@/lib/data/entity-lifecycle";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
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

	const { draftId, publishedId } = await db.transaction(async (tx) =>
		getDocumentVersions(tx, doc.id),
	);

	const { version } = await searchParamsPromise;
	const selectedVersion: "draft" | "published" =
		version === "published" && publishedId != null ? "published" : "draft";
	const versionId =
		selectedVersion === "published" && publishedId != null ? publishedId : (draftId ?? publishedId);
	if (versionId == null) {
		notFound();
	}

	const project = await db.query.projects.findFirst({
		where: { id: versionId },
		columns: {
			acronym: true,
			call: true,
			duration: true,
			funding: true,
			id: true,
			name: true,
			summary: true,
			topic: true,
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
					eq(schema.fields.entityVersionId, project.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		db.query.projectsToOrganisationalUnits.findMany({
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

	const description = descriptionRows.at(0)?.content ?? null;

	const image =
		project.image != null
			? {
					...project.image,
					url: images.generateSignedImageUrl({
						key: project.image.key,
						options: imageGridOptions,
					}).url,
				}
			: null;

	return (
		<ProjectDetails
			discardDraftAction={discardProjectDraftAction}
			documentId={doc.id}
			hasDraft={draftId != null}
			isPublished={publishedId != null}
			project={{
				...project,
				description,
				image,
				partners: partners.map((partner) => {
					return {
						id: partner.id,
						unitName: partner.unit.name,
						roleName: partner.role.role,
						duration: partner.duration ?? null,
					};
				}),
				socialMedia: socialMediaLinks.map((link) => link.socialMedia),
			}}
			publishAction={publishProjectAction}
			selectedVersion={selectedVersion}
		/>
	);
}
