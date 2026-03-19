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

	const [
		descriptionRows,
		scopes,
		orgUnits,
		roles,
		allSocialMedia,
		existingPartners,
		existingSocialMedia,
	] = await Promise.all([
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
		db.query.projectScopes.findMany({
			orderBy: { scope: "asc" },
			columns: { id: true, scope: true },
		}),
		db.query.organisationalUnits.findMany({
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
		}),
		db.query.projectRoles.findMany({
			orderBy: { role: "asc" },
			columns: { id: true, role: true },
		}),
		db.query.socialMedia.findMany({
			orderBy: { name: "asc" },
			columns: { id: true, name: true },
			with: {
				type: { columns: { type: true } },
			},
		}),
		db.query.projectPartners.findMany({
			where: { projectId: project.id },
			columns: { id: true, unitId: true, roleId: true, duration: true },
			with: {
				unit: { columns: { name: true } },
				role: { columns: { role: true } },
			},
		}),
		db.query.projectsToSocialMedia.findMany({
			where: { projectId: project.id },
			columns: { socialMediaId: true },
		}),
	]);

	const description = descriptionRows.at(0)?.content as JSONContent | undefined;

	const initialPartners = existingPartners.map((p) => {
		return {
			id: p.id,
			unitId: p.unitId,
			unitName: p.unit.name,
			roleId: p.roleId,
			roleName: p.role.role,
			durationStart: p.duration?.start != null ? p.duration.start.toISOString().slice(0, 10) : null,
			durationEnd: p.duration?.end != null ? p.duration.end.toISOString().slice(0, 10) : null,
		};
	});

	const initialSocialMediaIds = existingSocialMedia.map((row) => {
		return row.socialMediaId;
	});

	return (
		<ProjectEditForm
			assets={assets}
			initialPartners={initialPartners}
			initialSocialMediaIds={initialSocialMediaIds}
			orgUnits={orgUnits}
			project={{ ...project, description, image }}
			roles={roles}
			scopes={scopes}
			socialMediaItems={allSocialMedia}
		/>
	);
}
