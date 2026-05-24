"use client";

import type * as schema from "@dariah-eric/database/schema";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { EyeIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, startTransition, use, useOptimistic, useState } from "react";

import {
	EntityDeleteModal,
	EntityListHeader,
	NewLink,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
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
		(state, id: string) => state.filter((r) => r.id !== id),
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);

	return (
		<Fragment>
			<EntityListHeader
				title={t("Country reports")}
				description={t("Manage all country reports in the DARIAH knowledge base.")}
				action={
					<NewLink href="/dashboard/administrator/country-reports/create">{t("New")}</NewLink>
				}
			/>

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
					{(item) => (
						<TableRow id={item.id}>
							<TableCell>{item.country.name}</TableCell>
							<TableCell>{item.campaign.year}</TableCell>
							<TableCell>{formatStatus(item.status)}</TableCell>
							<TableCell className="text-end">
								<RowActionsMenu>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/country-reports/${item.id}`}
										icon={<EyeIcon className="me-2 block-4 inline-4" />}
									>
										{t("View")}
									</RowActionsMenu.Link>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/country-reports/${item.id}/edit`}
										icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
									>
										{t("Edit")}
									</RowActionsMenu.Link>
									<RowActionsMenu.Separator />
									<RowActionsMenu.Action
										danger={true}
										icon={<TrashIcon className="me-2 block-4 inline-4" />}
										onAction={() => {
											setItemToDelete({ id: item.id });
										}}
									>
										{t("Delete")}
									</RowActionsMenu.Action>
								</RowActionsMenu>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<EntityDeleteModal
				item={itemToDelete}
				model={t("country report")}
				isPending={false}
				onClose={() => {
					setItemToDelete(null);
				}}
				onConfirm={() => {
					if (itemToDelete == null) {
						return;
					}

					startTransition(async () => {
						optimisticallyRemoveReport(itemToDelete.id);
						await deleteCountryReportAction(itemToDelete.id);
						router.refresh();
						setItemToDelete(null);
					});
				}}
			/>
		</Fragment>
	);
}
