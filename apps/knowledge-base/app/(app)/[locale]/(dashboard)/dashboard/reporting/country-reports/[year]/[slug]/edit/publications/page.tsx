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

interface DashboardReportingCountryReportPublicationsPageProps extends PageProps<"/[locale]/dashboard/reporting/country-reports/[year]/[slug]/edit/publications"> {}

export async function generateMetadata(
	_props: Readonly<DashboardReportingCountryReportPublicationsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Dashboard - Country report publications"),
	});
}

export default async function DashboardReportingCountryReportPublicationsPage(
	props: Readonly<DashboardReportingCountryReportPublicationsPageProps>,
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

	const publicationsResult =
		actorIds.size === 0
			? null
			: await search.collections.resources.search({
					filterBy: `type:=publication && source:=zotero && year:=${year} && source_actor_ids:=[${[...actorIds].map((actorId) => `\`ssh-open-marketplace:${actorId}\``).join(",")}]`,
					perPage: 100,
					query: "*",
					queryBy: ["label", "description", "keywords"],
					sortBy: [{ field: "label", direction: "asc" }],
				});
	const publications = publicationsResult?.isOk() === true ? publicationsResult.value.items : [];

	return (
		<div className="flex flex-col gap-y-12">
			<div className="flex flex-col gap-y-4">
				<p className="text-sm text-muted-fg">{t("Publications from the Zotero library.")}</p>
				{actorIds.size === 0 ? (
					<p className="text-sm text-muted-fg italic">
						{t("This country has no national consortium with an SSH Open Marketplace actor id.")}
					</p>
				) : publications.length === 0 ? (
					<p className="text-sm text-muted-fg italic">
						{t("No Zotero publications found for this reporting year.")}
					</p>
				) : (
					<ul className="flex flex-col gap-y-3">
						{publications.map(({ document }) => (
							<li key={document.id} className="rounded-md border border-border p-4">
								<div className="flex flex-col gap-y-2">
									<div className="flex flex-col gap-y-1">
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
										<p className="text-xs text-muted-fg">
											{[document.authors?.join(", "), document.year, document.kind]
												.filter(Boolean)
												.join(" · ")}
										</p>
									</div>
									{document.description !== "" ? (
										<p className="line-clamp-3 text-sm text-muted-fg">{document.description}</p>
									) : null}
									{document.pid != null ? (
										<p className="text-xs text-muted-fg">
											{t("DOI: {doi}", { doi: document.pid })}
										</p>
									) : null}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<ReportScreenCommentSection
				reportId={report.id}
				reportType="country"
				screenKey="publications"
			/>
		</div>
	);
}
