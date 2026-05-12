import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ProjectEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_components/project-edit-form";
import { imageGridOptions } from "@/config/assets.config";
import { assertAuthenticated } from "@/lib/auth/session";
import { getMediaLibraryAssets } from "@/lib/data/assets";
import { ensureDraftVersion, getDocumentVersions } from "@/lib/data/entity-lifecycle";
import {
	getOrganisationalUnitOptions,
	getOrganisationalUnitOptionsByIds,
} from "@/lib/data/organisational-units";
import { projectsLifecycleAdapter } from "@/lib/data/projects.lifecycle-adapter";
import { getSocialMediaOptions, getSocialMediaOptionsByIds } from "@/lib/data/social-media";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
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

	await assertAuthenticated();

	const anyVersion = await db.query.projects.findFirst({
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

	const { draftVersionId, publishedId } = await db.transaction(async (tx) => {
		const draftVersionId = await ensureDraftVersion(tx, documentId, projectsLifecycleAdapter);
		const { publishedId } = await getDocumentVersions(tx, documentId);
		return { draftVersionId, publishedId };
	});

	const [{ items: initialAssets }, project] = await Promise.all([
		getMediaLibraryAssets({ imageUrlOptions: imageGridOptions, prefix: "logos" }),
		db.query.projects.findFirst({
			where: { id: draftVersionId },
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
		}),
	]);

	if (project == null) {
		notFound();
	}

	const [
		descriptionRows,
		scopes,
		initialOrgUnits,
		roles,
		initialSocialMedia,
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
					eq(schema.fields.entityVersionId, project.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		db.query.projectScopes.findMany({
			orderBy: { scope: "asc" },
			columns: { id: true, scope: true },
		}),
		getOrganisationalUnitOptions(),
		db.query.projectRoles.findMany({
			orderBy: { role: "asc" },
			columns: { id: true, role: true },
		}),
		getSocialMediaOptions(),
		db.query.projectsToOrganisationalUnits.findMany({
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

	const initialPartners = existingPartners.map((partner) => {
		return {
			id: partner.id,
			unitId: partner.unitId,
			unitName: partner.unit.name,
			roleId: partner.roleId,
			roleName: partner.role.role,
			durationStart:
				partner.duration?.start != null ? partner.duration.start.toISOString().slice(0, 10) : null,
			durationEnd:
				partner.duration?.end != null ? partner.duration.end.toISOString().slice(0, 10) : null,
		};
	});

	const initialSocialMediaIds = existingSocialMedia.map((row) => {
		return row.socialMediaId;
	});

	const [selectedSocialMediaItems, selectedPartnerUnits] = await Promise.all([
		getSocialMediaOptionsByIds(initialSocialMediaIds),
		getOrganisationalUnitOptionsByIds(
			initialPartners.map((partner) => {
				return partner.unitId;
			}),
		),
	]);

	const description = descriptionRows.at(0)?.content;

	const resolvedPartners = initialPartners.map((partner) => {
		const matchedUnit = selectedPartnerUnits.find((unit) => {
			return unit.id === partner.unitId;
		});

		return { ...partner, unitName: matchedUnit?.name ?? partner.unitName };
	});

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
		<ProjectEditForm
			documentId={documentId}
			initialAssets={initialAssets}
			initialOrgUnitItems={initialOrgUnits.items}
			initialOrgUnitTotal={initialOrgUnits.total}
			initialPartners={resolvedPartners}
			initialSocialMediaIds={initialSocialMediaIds}
			initialSocialMediaItems={initialSocialMedia.items}
			initialSocialMediaTotal={initialSocialMedia.total}
			isPublished={publishedId != null}
			project={{ ...project, description, image }}
			roles={roles}
			scopes={scopes}
			selectedSocialMediaItems={selectedSocialMediaItems}
		/>
	);
}
