"use client";

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
import { type AuditLogAction, type AuditLogResult, auditLogActions } from "@/lib/data/audit-log";
import type { ExpensiveStatementsResult } from "@/lib/data/pg-stat-statements";

interface InternalDashboardProps {
	action: AuditLogAction | undefined;
	auditLog: AuditLogResult;
	page: number;
	statements: ExpensiveStatementsResult;
}

const pageSize = dashboardPageSize;

function humanizeAction(action: string): string {
	return action.replaceAll("_", " ");
}

export function InternalDashboard(props: Readonly<InternalDashboardProps>): ReactNode {
	const { action, auditLog, page, statements } = props;

	const t = useExtracted();
	const format = useFormatter();
	const [selectedTab, setSelectedTab] = useState<Key>("audit");

	const search = useUrlPaginatedSearch({
		filters: { action: action ?? "" },
		page,
		q: "",
	});

	const selectedAction = search.filters.action !== "" ? search.filters.action : "all";

	return (
		<Fragment>
			<EntityListHeader
				title={t("Internal")}
				description={t("Internal diagnostics for administrators. Not linked from the menu.")}
			/>

			<Tabs onSelectionChange={setSelectedTab} selectedKey={selectedTab}>
				<TabList aria-label={t("Internal diagnostics")}>
					<Tab id="audit">{t("Audit log")}</Tab>
					<Tab id="statements">{t("Expensive queries")}</Tab>
				</TabList>

				<TabPanel id="audit">
					<div className="my-4 flex justify-end">
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
								{auditLogActions.map((value) => (
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
			</Tabs>
		</Fragment>
	);
}
