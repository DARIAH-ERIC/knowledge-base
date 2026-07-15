"use client";

import { Link } from "@dariah-eric/ui/link";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useClientPagination } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/use-client-pagination";
import type {
	MutuallyExclusiveUnitRelationCheckResult,
	RelationInterval,
} from "@/lib/data/data-integrity";
import { getEntityDetailHref } from "@/lib/entity-detail-href";

interface MutuallyExclusiveRelationsCheckProps {
	result: MutuallyExclusiveUnitRelationCheckResult;
}

export function MutuallyExclusiveRelationsCheck(
	props: Readonly<MutuallyExclusiveRelationsCheckProps>,
): ReactNode {
	const { result } = props;

	const t = useExtracted();
	const format = useFormatter();

	const findings = result.findings.map((finding) => {
		return { ...finding, id: `${finding.rule}:${finding.unitDocumentId}` };
	});

	const { page, pageItems, perPage, setPage, totalItems, totalPages } =
		useClientPagination(findings);

	function formatIntervals(intervals: Array<RelationInterval>): ReactNode {
		if (intervals.length === 0) {
			return "—";
		}

		return intervals.map((interval) => {
			const start = format.dateTime(new Date(interval.start), { dateStyle: "medium" });
			const end =
				interval.end != null
					? format.dateTime(new Date(interval.end), { dateStyle: "medium" })
					: t("ongoing");

			return (
				<span className="block whitespace-nowrap" key={`${interval.start}:${interval.end ?? ""}`}>
					{start} – {end}
				</span>
			);
		});
	}

	return (
		<Fragment>
			{result.errors.length > 0 ? (
				<div className="flex flex-col gap-y-1 text-danger-subtle-fg text-sm">
					{result.errors.map((error) => (
						<p key={error}>{error}</p>
					))}
				</div>
			) : null}

			<Table
				aria-label={t("Mutually exclusive relations")}
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn id="unit" isRowHeader={true}>
						{t("Organisational unit")}
					</TableColumn>
					<TableColumn id="implied-by">{t("Has")}</TableColumn>
					<TableColumn id="redundant">{t("Redundant")}</TableColumn>
					<TableColumn id="overlaps">{t("Overlapping periods")}</TableColumn>
				</TableHeader>
				<TableBody
					items={pageItems}
					renderEmptyState={() => (
						<p className="p-(--gutter) text-muted-fg text-sm">
							{t("No data-integrity issues found.")}
						</p>
					)}
				>
					{(finding) => {
						const href = getEntityDetailHref({
							entityType: "organisational_units",
							unitType: finding.unitType,
							slug: finding.unitSlug,
						});

						return (
							<TableRow id={finding.id}>
								<TableCell>
									{href != null ? (
										<Link className="underline" href={href}>
											{finding.unitLabel}
										</Link>
									) : (
										finding.unitLabel
									)}
								</TableCell>
								<TableCell>
									<span className="block max-inline-96 whitespace-normal">
										{finding.impliedByLabel}
									</span>
								</TableCell>
								<TableCell>
									<span className="block max-inline-96 whitespace-normal text-danger-subtle-fg">
										{finding.redundantLabel}
									</span>
								</TableCell>
								<TableCell>{formatIntervals(finding.overlaps)}</TableCell>
							</TableRow>
						);
					}}
				</TableBody>
			</Table>

			{totalItems > perPage ? (
				<Paginate
					page={page}
					perPage={perPage}
					setPage={setPage}
					total={totalPages}
					totalItems={totalItems}
				/>
			) : null}
		</Fragment>
	);
}
