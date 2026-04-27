"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Button, buttonStyles } from "@dariah-eric/ui/button";
import { Link } from "@dariah-eric/ui/link";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@dariah-eric/ui/menu";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import {
	EllipsisHorizontalIcon,
	PencilSquareIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, startTransition, use, useOptimistic, useState } from "react";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { deleteCountryReportAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/country-reports/_lib/delete-country-report.action";
import { useRouter } from "@/lib/navigation/navigation";

type CountryReportRow = Pick<schema.CountryReport, "id" | "status"> & {
	campaign: Pick<schema.ReportingCampaign, "id" | "year">;
	country: Pick<schema.OrganisationalUnit, "id" | "name">;
};

interface CountryReportsPageProps {
	reports: Promise<Array<CountryReportRow>>;
}

function formatStatus(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1);
}

export function CountryReportsPage(props: Readonly<CountryReportsPageProps>): ReactNode {
	const { reports: reportsPromise } = props;

	const resolvedReports = use(reportsPromise);

	const t = useExtracted();
	const router = useRouter();
	const [reports, optimisticallyRemoveReport] = useOptimistic(
		resolvedReports,
		(state, id: string) => {
			return state.filter((r) => {
				return r.id !== id;
			});
		},
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Country reports")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all country reports in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/country-reports/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="country reports"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Country")}</TableColumn>
					<TableColumn>{t("Campaign")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={reports}>
					{(item) => {
						return (
							<TableRow id={item.id}>
								<TableCell>{item.country.name}</TableCell>
								<TableCell>{item.campaign.year}</TableCell>
								<TableCell>{formatStatus(item.status)}</TableCell>
								<TableCell className="text-end">
									<Menu>
										<Button
											aria-label={t("Open actions menu")}
											className="h-7 sm:h-7"
											intent="plain"
											size="sq-sm"
										>
											<EllipsisHorizontalIcon className="size-5" />
										</Button>
										<MenuContent placement="left top">
											<MenuItem href={`/dashboard/administrator/country-reports/${item.id}/edit`}>
												<PencilSquareIcon className="mr-2 size-4" />
												<MenuLabel>{t("Edit")}</MenuLabel>
											</MenuItem>
											<MenuSeparator />
											<MenuItem
												intent="danger"
												onAction={() => {
													setItemToDelete({ id: item.id });
												}}
											>
												<TrashIcon className="mr-2 size-4" />
												<MenuLabel>{t("Delete")}</MenuLabel>
											</MenuItem>
										</MenuContent>
									</Menu>
								</TableCell>
							</TableRow>
						);
					}}
				</TableBody>
			</Table>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("country report")}
				onAction={() => {
					if (itemToDelete == null) return;

					startTransition(async () => {
						optimisticallyRemoveReport(itemToDelete.id);
						await deleteCountryReportAction(itemToDelete.id);
						router.refresh();
						setItemToDelete(null);
					});
				}}
				onOpenChange={(open) => {
					if (!open) setItemToDelete(null);
				}}
			/>
		</Fragment>
	);
}
