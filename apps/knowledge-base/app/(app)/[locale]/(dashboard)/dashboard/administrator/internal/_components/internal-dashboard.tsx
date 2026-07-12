"use client";

import { auditLogActionEnum } from "@dariah-eric/database/schema";
import { Badge } from "@dariah-eric/ui/badge";
import { Link } from "@dariah-eric/ui/link";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";
import type { Key } from "react-aria-components";

import {
	EntityListHeader,
	EntityListPagination,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { dashboardPageSize } from "@/config/pagination.config";
import type { AuditLogAction, AuditLogResult } from "@/lib/data/audit-log";
import type {
	DerivedRelationCheckResult,
	DerivedRelationFindingKind,
	DerivedRelationInterval,
} from "@/lib/data/data-integrity";
import type { ExpensiveStatementsResult } from "@/lib/data/pg-stat-statements";
import { getEntityDetailHref } from "@/lib/entity-detail-href";

interface InternalDashboardProps {
	action: AuditLogAction | undefined;
	auditLog: AuditLogResult;
	integrity: DerivedRelationCheckResult;
	page: number;
	statements: ExpensiveStatementsResult;
}

const pageSize = dashboardPageSize;

function humanizeAction(action: string): string {
	return action.replaceAll("_", " ");
}

const findingKindBadgeIntents: Record<DerivedRelationFindingKind, "amber" | "rose"> = {
	missing_derived: "amber",
	missing_source: "amber",
	duration_mismatch: "rose",
};

export function InternalDashboard(props: Readonly<InternalDashboardProps>): ReactNode {
	const { action, auditLog, integrity, page, statements } = props;

	const t = useExtracted();
	const format = useFormatter();
	const [selectedTab, setSelectedTab] = useState<Key>("audit");

	const search = useUrlPaginatedSearch({
		filters: { action: action ?? "" },
		page,
		q: "",
	});

	const selectedAction = search.filters.action !== "" ? search.filters.action : "all";

	function formatIntervals(intervals: Array<DerivedRelationInterval>): ReactNode {
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
			<EntityListHeader
				title={t("Internal")}
				description={t("Internal diagnostics for administrators.")}
			/>

			<Tabs onSelectionChange={setSelectedTab} selectedKey={selectedTab}>
				<TabList aria-label={t("Internal diagnostics")}>
					<Tab id="audit">{t("Audit log")}</Tab>
					<Tab id="statements">{t("Expensive queries")}</Tab>
					<Tab id="integrity">{t("Data integrity")}</Tab>
				</TabList>

				<TabPanel id="audit" className="flex flex-col gap-y-(--layout-padding)">
					<div className="flex justify-end">
						<Select
							aria-label={t("Filter by action")}
							onChange={(key) => {
								const value = String(key);
								search.setFilter("action", value === "all" ? "" : value);
							}}
							value={selectedAction}
						>
							<SelectTrigger />
							<SelectContent>
								<SelectItem id="all">{t("All actions")}</SelectItem>
								{auditLogActionEnum.map((value) => (
									<SelectItem key={value} id={value}>
										{humanizeAction(value)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Table
						aria-label={t("Audit log")}
						className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
					>
						<TableHeader>
							<TableColumn id="createdAt" isRowHeader={true}>
								{t("Time")}
							</TableColumn>
							<TableColumn id="actor">{t("Actor")}</TableColumn>
							<TableColumn id="action">{t("Action")}</TableColumn>
							<TableColumn id="subject">{t("Subject")}</TableColumn>
							<TableColumn id="summary">{t("Summary")}</TableColumn>
						</TableHeader>
						<TableBody items={auditLog.data} renderEmptyState={() => t("No audit log entries.")}>
							{(item) => (
								<TableRow id={item.id}>
									<TableCell>
										{format.dateTime(item.createdAt, {
											dateStyle: "medium",
											timeStyle: "short",
										})}
									</TableCell>
									<TableCell>{item.actorLabel}</TableCell>
									<TableCell>{humanizeAction(item.action)}</TableCell>
									<TableCell>
										<span className="block">{item.subjectLabel}</span>
										<span className="block text-muted-fg text-xs">{item.subjectType}</span>
									</TableCell>
									<TableCell>
										<code className="text-xs">{JSON.stringify(item.summary)}</code>
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>

					<EntityListPagination search={search} total={auditLog.total} pageSize={pageSize} />
				</TabPanel>

				<TabPanel id="statements">
					{statements.available ? (
						<Table
							aria-label={t("Expensive queries")}
							className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
						>
							<TableHeader>
								<TableColumn id="query" isRowHeader={true}>
									{t("Query")}
								</TableColumn>
								<TableColumn id="calls">{t("Calls")}</TableColumn>
								<TableColumn id="totalExecTime">{t("Total time (ms)")}</TableColumn>
								<TableColumn id="meanExecTime">{t("Mean time (ms)")}</TableColumn>
								<TableColumn id="rows">{t("Rows")}</TableColumn>
							</TableHeader>
							<TableBody
								items={statements.data.map((statement, index) => {
									return { ...statement, id: index };
								})}
								renderEmptyState={() => t("No statements recorded yet.")}
							>
								{(item) => (
									<TableRow id={item.id}>
										<TableCell>
											<code className="block max-inline-3xl whitespace-pre-wrap text-xs">
												{item.query}
											</code>
										</TableCell>
										<TableCell>{format.number(item.calls)}</TableCell>
										<TableCell>
											{format.number(item.totalExecTime, { maximumFractionDigits: 1 })}
										</TableCell>
										<TableCell>
											{format.number(item.meanExecTime, { maximumFractionDigits: 2 })}
										</TableCell>
										<TableCell>{format.number(item.rows)}</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					) : (
						<div className="my-8 text-balance text-muted-fg text-sm">
							{t(
								"The pg_stat_statements extension is not enabled on this database. Enable it via shared_preload_libraries in the Postgres configuration to see query statistics.",
							)}
						</div>
					)}
				</TabPanel>

				<TabPanel id="integrity" className="flex flex-col gap-y-(--layout-padding)">
					<div className="text-balance text-muted-fg text-sm">
						{t(
							"Relations which must be entered twice, e.g. a national coordinator must also be a member of the General Assembly for the same period. Same checks as the data:audit:derived-relations script.",
						)}
					</div>

					{integrity.errors.length > 0 ? (
						<div className="flex flex-col gap-y-1 text-danger-subtle-fg text-sm">
							{integrity.errors.map((error) => (
								<p key={error}>{error}</p>
							))}
						</div>
					) : null}

					<Table
						aria-label={t("Data integrity")}
						className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
					>
						<TableHeader>
							<TableColumn id="person" isRowHeader={true}>
								{t("Person")}
							</TableColumn>
							<TableColumn id="kind">{t("Issue")}</TableColumn>
							<TableColumn id="detail">{t("Detail")}</TableColumn>
							<TableColumn id="source">{t("Source periods")}</TableColumn>
							<TableColumn id="derived">{t("Derived periods")}</TableColumn>
						</TableHeader>
						<TableBody
							items={integrity.findings.map((finding) => {
								return {
									...finding,
									id: `${finding.rule}:${finding.kind}:${finding.personDocumentId}`,
								};
							})}
							renderEmptyState={() => t("No data-integrity issues found.")}
						>
							{(finding) => {
								const href = getEntityDetailHref({
									entityType: "persons",
									slug: finding.personSlug,
								});

								return (
									<TableRow id={finding.id}>
										<TableCell>
											{href != null ? (
												<Link className="underline" href={href}>
													{finding.personLabel}
												</Link>
											) : (
												finding.personLabel
											)}
										</TableCell>
										<TableCell>
											<Badge intent={findingKindBadgeIntents[finding.kind]}>
												{humanizeAction(finding.kind)}
											</Badge>
										</TableCell>
										<TableCell>
											<span className="block max-inline-96 whitespace-normal">
												{finding.detail}
											</span>
										</TableCell>
										<TableCell>{formatIntervals(finding.sourceIntervals)}</TableCell>
										<TableCell>{formatIntervals(finding.derivedIntervals)}</TableCell>
									</TableRow>
								);
							}}
						</TableBody>
					</Table>
				</TabPanel>
			</Tabs>
		</Fragment>
	);
}
