import * as schema from "@dariah-eric/database/schema";
import type { ResourceItem, SearchResourcesParams } from "@dariah-eric/search";
import { getExtracted } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import type { ReportSummarySectionLink } from "@/app/(app)/[locale]/(dashboard)/dashboard/reporting/_components/report-summary-section";
import { db } from "@/lib/db";
import { and, eq, sql } from "@/lib/db/sql";
import { search } from "@/lib/search";

type LiveResourceKind = "country" | "workingGroup";

/** Stable anchor ids for the live-data sections, shared with the "On this page" nav. */
export const liveReportSoftwareSectionId = "live-report-software";
export const liveReportPublicationsSectionId = "live-report-publications";

/** Static section heading + anchor. Carries no fetched data, so it always renders immediately. */
interface LiveSectionDescriptor {
	description: string;
	id: string;
	title: string;
}

/** Data-bearing result for a section; resolved by the (async) marketplace search. */
interface LiveSectionResult {
	emptyMessage: string;
	id: string;
	items: Array<ResourceItem>;
}

/**
 * The static headings/anchors for the live-data sections, derived purely from translations (no DB
 * or search). Shared by {@link LiveReportResources} and {@link getLiveReportResourceNavLinks} so the
 * nav labels and section titles stay in sync.
 */
async function getLiveSectionDescriptors(
	reportKind: LiveResourceKind,
): Promise<Array<LiveSectionDescriptor>> {
	const t = await getExtracted();

	return [
		{
			description:
				reportKind === "country"
					? t("Live SSH Open Marketplace software filtered by campaign year and actor identifier.")
					: t(
							"Live SSH Open Marketplace resources filtered by campaign year and actor identifier.",
						),
			id: liveReportSoftwareSectionId,
			title: reportKind === "country" ? t("SSHOC software") : t("SSHOC resources"),
		},
		{
			description: t("Live Zotero publications filtered by campaign year and actor identifier."),
			id: liveReportPublicationsSectionId,
			title: t("Zotero publications"),
		},
	];
}

/**
 * Nav links for the live-data sections. Built without running the (expensive) marketplace search so
 * the surrounding summary's "On this page" nav can render immediately; the anchors are part of the
 * static {@link LiveReportResources} shell and are always present in the DOM.
 */
export async function getLiveReportResourceNavLinks(
	reportKind: LiveResourceKind,
): Promise<Array<ReportSummarySectionLink>> {
	const descriptors = await getLiveSectionDescriptors(reportKind);

	return descriptors.map((descriptor) => {
		return { id: descriptor.id, label: descriptor.title };
	});
}

interface LiveReportResourcesProps {
	reportId: string;
	reportKind: LiveResourceKind;
}

function quoteFilterValue(value: string): string {
	return `\`${value.replaceAll("`", "\\`")}\``;
}

async function searchAllResources(params: SearchResourcesParams): Promise<Array<ResourceItem>> {
	const firstResult = await search.collections.resources.search({ ...params, page: 1 });

	if (firstResult.isErr()) {
		throw firstResult.error;
	}

	const remainingResults = await Promise.all(
		Array.from({ length: Math.max(firstResult.value.pagination.totalPages - 1, 0) }, (_, index) =>
			search.collections.resources.search({ ...params, page: index + 2 }),
		),
	);

	return [
		...firstResult.value.items,
		...remainingResults.flatMap((result) => {
			if (result.isErr()) {
				throw result.error;
			}

			return result.value.items;
		}),
	];
}

async function getCountryNationalConsortiumSlugs(
	countryDocumentId: string,
	year: number,
): Promise<Array<string>> {
	const rows = await db
		.select({ slug: schema.entities.slug })
		.from(schema.organisationalUnitsRelations)
		.innerJoin(
			schema.organisationalUnitStatus,
			eq(schema.organisationalUnitStatus.id, schema.organisationalUnitsRelations.status),
		)
		.innerJoin(
			schema.entities,
			eq(schema.entities.id, schema.organisationalUnitsRelations.unitDocumentId),
		)
		.innerJoin(
			schema.documentLifecycle,
			eq(schema.documentLifecycle.documentId, schema.entities.id),
		)
		.innerJoin(
			schema.organisationalUnits,
			sql`${schema.organisationalUnits.id} = COALESCE(${schema.documentLifecycle.publishedId}, ${schema.documentLifecycle.draftId})`,
		)
		.innerJoin(
			schema.organisationalUnitTypes,
			eq(schema.organisationalUnitTypes.id, schema.organisationalUnits.typeId),
		)
		.where(
			and(
				// unit↔unit relations and the report's country are both document-level.
				eq(schema.organisationalUnitsRelations.relatedUnitDocumentId, countryDocumentId),
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

	return rows.map((row) => row.slug);
}

async function getWorkingGroupSlug(workingGroupDocumentId: string): Promise<string | null> {
	const rows = await db
		.select({ slug: schema.entities.slug })
		.from(schema.entities)
		.where(eq(schema.entities.id, workingGroupDocumentId))
		.limit(1);

	return rows[0]?.slug ?? null;
}

async function getCountrySections(reportId: string): Promise<Array<LiveSectionResult>> {
	const t = await getExtracted();
	const report = await db.query.countryReports.findFirst({
		where: { id: reportId },
		columns: { countryDocumentId: true },
		with: { campaign: { columns: { year: true } } },
	});

	const consortiumSlugs =
		report == null
			? []
			: await getCountryNationalConsortiumSlugs(report.countryDocumentId, report.campaign.year);

	if (report == null || consortiumSlugs.length === 0) {
		const emptyMessage =
			report == null
				? t("No SSH Open Marketplace software found for this country.")
				: t("This country has no national consortium for the selected campaign year.");
		const publicationsEmptyMessage =
			report == null
				? t("No Zotero publications found for this reporting year.")
				: t("This country has no national consortium for the selected campaign year.");

		return [
			{ emptyMessage, id: liveReportSoftwareSectionId, items: [] },
			{ emptyMessage: publicationsEmptyMessage, id: liveReportPublicationsSectionId, items: [] },
		];
	}

	const consortiumFilter = `[${consortiumSlugs.map(quoteFilterValue).join(",")}]`;
	const baseParams = {
		perPage: 100,
		query: "*",
		queryBy: ["label", "description", "keywords"],
		sortBy: [{ field: "label", direction: "asc" }],
	} satisfies Partial<SearchResourcesParams>;

	const [software, publications] = await Promise.all([
		searchAllResources({
			...baseParams,
			filterBy: `type:=software && source:=ssh-open-marketplace && national_consortia:=${consortiumFilter}`,
		}),
		searchAllResources({
			...baseParams,
			filterBy: `type:=publication && source:=zotero && year:=${report.campaign.year} && national_consortia:=${consortiumFilter}`,
		}),
	]);

	return [
		{
			emptyMessage: t("No SSH Open Marketplace software found for this country."),
			id: liveReportSoftwareSectionId,
			items: software,
		},
		{
			emptyMessage: t("No Zotero publications found for this reporting year."),
			id: liveReportPublicationsSectionId,
			items: publications,
		},
	];
}

async function getWorkingGroupSections(reportId: string): Promise<Array<LiveSectionResult>> {
	const t = await getExtracted();
	const report = await db.query.workingGroupReports.findFirst({
		where: { id: reportId },
		columns: { workingGroupDocumentId: true },
		with: { campaign: { columns: { year: true } } },
	});

	const slug = report == null ? null : await getWorkingGroupSlug(report.workingGroupDocumentId);

	if (report == null || slug == null) {
		const emptyMessage = t("No working group actor identifier is available for this report.");

		return [
			{ emptyMessage, id: liveReportSoftwareSectionId, items: [] },
			{ emptyMessage, id: liveReportPublicationsSectionId, items: [] },
		];
	}

	const workingGroupFilter = `[${quoteFilterValue(slug)}]`;
	const baseParams = {
		perPage: 100,
		query: "*",
		queryBy: ["label", "description", "keywords"],
		sortBy: [{ field: "label", direction: "asc" }],
	} satisfies Partial<SearchResourcesParams>;

	const [resources, publications] = await Promise.all([
		searchAllResources({
			...baseParams,
			filterBy: `source:=ssh-open-marketplace && working_groups:=${workingGroupFilter}`,
		}),
		searchAllResources({
			...baseParams,
			filterBy: `type:=publication && source:=zotero && year:=${report.campaign.year} && working_groups:=${workingGroupFilter}`,
		}),
	]);

	return [
		{
			emptyMessage: t("No SSH Open Marketplace resources found for this working group."),
			id: liveReportSoftwareSectionId,
			items: resources,
		},
		{
			emptyMessage: t("No Zotero publications found for this reporting year."),
			id: liveReportPublicationsSectionId,
			items: publications,
		},
	];
}

function ResourceList({ items }: Readonly<{ items: Array<ResourceItem> }>): ReactNode {
	return (
		<ul className="flex flex-col gap-y-3">
			{items.map(({ document }) => (
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
						<p className="text-xs text-muted-fg">
							{[document.source, document.type, document.year, document.kind]
								.filter(Boolean)
								.join(" · ")}
						</p>
						{document.description !== "" ? (
							<p className="line-clamp-3 text-sm text-muted-fg">{document.description}</p>
						) : null}
					</div>
				</li>
			))}
		</ul>
	);
}

/**
 * The async, data-bearing body of a single live-data section. Awaiting the shared `resultsPromise`
 * (rather than re-fetching per section) keeps the search to a single call; this is the only part
 * wrapped in `<Suspense>`, so the section heading + anchor above it stay in the DOM while it
 * loads.
 */
async function LiveResourceSectionItems(
	props: Readonly<{ resultsPromise: Promise<Array<LiveSectionResult>>; sectionId: string }>,
): Promise<ReactNode> {
	const { resultsPromise, sectionId } = props;

	const results = await resultsPromise;
	const result = results.find((section) => section.id === sectionId);

	if (result == null || result.items.length === 0) {
		return <p className="text-sm text-muted-fg italic">{result?.emptyMessage}</p>;
	}

	return <ResourceList items={result.items} />;
}

export async function LiveReportResources(
	props: Readonly<LiveReportResourcesProps>,
): Promise<ReactNode> {
	const { reportId, reportKind } = props;
	const t = await getExtracted();
	const descriptors = await getLiveSectionDescriptors(reportKind);

	// Kick off the marketplace search once and share the promise across sections. It is intentionally
	// not awaited here so the static headings/anchors below render immediately; each section awaits it
	// inside its own `<Suspense>`.
	const resultsPromise =
		reportKind === "country" ? getCountrySections(reportId) : getWorkingGroupSections(reportId);

	return (
		<section className="flex flex-col gap-y-4">
			<div className="flex flex-col gap-y-1">
				<h2 className="text-sm font-semibold text-fg">{t("Live external data")}</h2>
				<p className="text-sm text-muted-fg">
					{t(
						"This fetches current search-index data on demand. These results are not stored as a report snapshot in the database.",
					)}
				</p>
			</div>

			<div className="flex flex-col gap-y-8">
				{descriptors.map((descriptor) => (
					<section
						key={descriptor.id}
						className="flex scroll-mbs-24 flex-col gap-y-3"
						id={descriptor.id}
					>
						<div className="flex flex-col gap-y-1">
							<h3 className="text-sm font-semibold text-fg">{descriptor.title}</h3>
							<p className="text-xs text-muted-fg">{descriptor.description}</p>
						</div>
						<Suspense
							fallback={<p className="text-sm text-muted-fg">{t("Loading live external data…")}</p>}
						>
							<LiveResourceSectionItems resultsPromise={resultsPromise} sectionId={descriptor.id} />
						</Suspense>
					</section>
				))}
			</div>
		</section>
	);
}
