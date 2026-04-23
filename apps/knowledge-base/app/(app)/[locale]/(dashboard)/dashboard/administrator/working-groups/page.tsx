import { and, eq, inArray, sql } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { LoadingScreen } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/loading-screen";
import { WorkingGroupsPage } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_components/working-groups-page";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorWorkingGroupsPageProps extends PageProps<"/[locale]/dashboard/administrator/working-groups"> {}

async function getWorkingGroupsForDashboard(): Promise<
	Array<
		Pick<schema.OrganisationalUnit, "id" | "name"> & {
			durationFrom: Date | null;
			durationUntil: Date | null;
			entity: Pick<schema.Entity, "documentId" | "slug"> & {
				status: Pick<schema.EntityStatus, "id" | "type">;
			};
		}
	>
> {
	const [workingGroups, erics] = await Promise.all([
		db.query.organisationalUnits.findMany({
			where: { type: { type: "working_group" } },
			orderBy: { name: "asc" },
			columns: {
				id: true,
				name: true,
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
			},
		}),
		db.query.organisationalUnits.findMany({
			where: { type: { type: "eric" } },
			columns: { id: true },
		}),
	]);

	const workingGroupIds = workingGroups.map((workingGroup) => {
		return workingGroup.id;
	});
	const ericIds = erics.map((eric) => {
		return eric.id;
	});

	if (workingGroupIds.length === 0 || ericIds.length === 0) {
		return workingGroups.map((workingGroup) => {
			return {
				...workingGroup,
				durationFrom: null,
				durationUntil: null,
			};
		});
	}

	const relations = await db
		.select({
			duration: schema.organisationalUnitsRelations.duration,
			unitId: schema.organisationalUnitsRelations.unitId,
		})
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.where(
			and(
				inArray(schema.organisationalUnitsRelations.unitId, workingGroupIds),
				inArray(schema.organisationalUnitsRelations.relatedUnitId, ericIds),
				eq(schema.organisationalUnitStatus.status, "is_part_of"),
				sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
			),
		);

	const relationByWorkingGroupId = new Map<string, { from: Date; until: Date | null }>();

	for (const relation of relations) {
		if (!relationByWorkingGroupId.has(relation.unitId)) {
			relationByWorkingGroupId.set(relation.unitId, {
				from: relation.duration.start,
				until: relation.duration.end ?? null,
			});
		}
	}

	return workingGroups.map((workingGroup) => {
		const relation = relationByWorkingGroupId.get(workingGroup.id);

		return {
			...workingGroup,
			durationFrom: relation?.from ?? null,
			durationUntil: relation?.until ?? null,
		};
	});
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Working groups"),
	});

	return metadata;
}

export default function DashboardAdministratorWorkingGroupsPage(
	_props: Readonly<DashboardAdministratorWorkingGroupsPageProps>,
): ReactNode {
	const workingGroups = getWorkingGroupsForDashboard();

	return (
		<Suspense fallback={<LoadingScreen />}>
			<WorkingGroupsPage workingGroups={workingGroups} />
		</Suspense>
	);
}
