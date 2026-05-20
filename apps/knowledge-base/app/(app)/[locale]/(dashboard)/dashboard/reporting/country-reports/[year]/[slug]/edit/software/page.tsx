import * as schema from "@dariah-eric/database/schema";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ReportScreenCommentSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-screen-comment-section";
import { getAuthorizedCountryReportForUser } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/country-reports/_lib/get-country-report-summary-data";
import { assertAuthenticated } from "@/lib/auth/session";
import { resolveCountryReportId } from "@/lib/data/reporting-urls";
import { db } from "@/lib/db";
import { and, eq, sql } from "@/lib/db/sql";
import { search } from "@/lib/search";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardReportingCountryReportSoftwarePageProps extends PageProps<"/[locale]/dashboard/reporting/country-reports/[year]/[slug]/edit/software"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportSoftwarePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report software"),
	});
}

export default async function DashboardReportingCountryReportSoftwarePage(
	props: Readonly<DashboardReportingCountryReportSoftwarePageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { year: routeYear, slug } = await params;
	const id = await resolveCountryReportId({ year: routeYear, slug });

	if (id == null) {
		notFound();
	}

	const { user } = await assertAuthenticated();
	const result = await getAuthorizedCountryReportForUser(
		user,
		id,
		(id) =>
			db.query.countryReports.findFirst({
				where: { id },
				columns: { id: true },
				with: {
					country: {
						columns: { id: true },
					},
				},
			}),
		"update",
	);

	if (result.status !== "ok") {
		notFound();
	}
	const report = result.data;
	if (report == null) {
		notFound();
	}

	const t = await getExtracted();
	const year = Number(routeYear);
	const actorIds = new Set<number>();

	const nationalConsortiumActorIds = await db
		.select({ sshocMarketplaceActorId: schema.organisationalUnits.sshocMarketplaceActorId })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			schema.organisationalUnits,
			eq(schema.organisationalUnits.id, schema.organisationalUnitsRelations.unitId),
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			and(
				eq(schema.organisationalUnitsRelations.relatedUnitId, report.country.id),
				eq(schema.organisationalUnitStatus.status, "is_national_consortium_of"),
				eq(
					schema.organisationalUnitTypes.type,
					"national_consortium" as typeof schema.organisationalUnitTypes.$inferSelect.type,
				),
				sql`
					${schema.organisationalUnitsRelations.duration} && tstzrange (
						MAKE_DATE(${year}, 1, 1)::TIMESTAMPTZ,
						MAKE_DATE(${year + 1}, 1, 1)::TIMESTAMPTZ
					)
				`,
			),
		);

	for (const { sshocMarketplaceActorId } of nationalConsortiumActorIds) {
		if (sshocMarketplaceActorId != null) {
			actorIds.add(sshocMarketplaceActorId);
		}
	}

	const softwareResult =
		actorIds.size === 0
			? null
			: await search.collections.resources.search({
					filterBy: `type:=software && source:=ssh-open-marketplace && source_actor_ids:=[${[...actorIds].map((actorId) => `\`ssh-open-marketplace:${actorId}\``).join(",")}]`,
					perPage: 100,
					query: "*",
					queryBy: ["label", "description", "keywords"],
					sortBy: [{ field: "label", direction: "asc" }],
				});
	const software = softwareResult?.isOk() === true ? softwareResult.value.items : [];

	return (
		<div className="flex flex-col gap-y-12">
			<div className="flex flex-col gap-y-4">
				<p className="text-sm text-muted-fg">
					{t("Software contributions from the SSH Open Marketplace.")}
				</p>
				{actorIds.size === 0 ? (
					<p className="text-sm text-muted-fg italic">
						{t("This country has no national consortium with an SSH Open Marketplace actor id.")}
					</p>
				) : software.length === 0 ? (
					<p className="text-sm text-muted-fg italic">
						{t("No SSH Open Marketplace software found for this country.")}
					</p>
				) : (
					<ul className="flex flex-col gap-y-3">
						{software.map(({ document }) => (
							<li key={document.id} className="rounded-md border border-border p-4">
								<div className="flex flex-col gap-y-2">
									{document.links[0] != null ? (
										<a
											className="text-sm font-semibold text-fg underline-offset-4 hover:underline"
											href={document.links[0]}
											rel="noreferrer"
											target="_blank"
										>
											{document.label}
										</a>
									) : (
										<p className="text-sm font-semibold text-fg">{document.label}</p>
									)}
									{document.description !== "" ? (
										<p className="line-clamp-3 text-sm text-muted-fg">{document.description}</p>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<ReportScreenCommentSection reportId={report.id} reportType="country" screenKey="software" />
		</div>
	);
}
