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
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import {
	EntityDeleteModal,
	EntityListHeader,
	EntityListPagination,
	EntityListSearchField,
	NewLink,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { deleteReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/delete-reporting-campaign.action";
import { dashboardPageSize } from "@/config/pagination.config";
import { useRouter } from "@/lib/navigation/navigation";

interface ReportingCampaignsPageProps {
	campaigns: {
		data: Array<
			Pick<schema.ReportingCampaign, "id" | "year" | "status"> & {
				hasReports: boolean;
				reportCount: number;
			}
		>;
		total: number;
	};
	page: number;
	q: string;
}

const pageSize = dashboardPageSize;

export function ReportingCampaignsPage(props: Readonly<ReportingCampaignsPageProps>): ReactNode {
	const { campaigns, page: initialPage, q: initialQ } = props;

	const t = useExtracted();
	const router = useRouter();
	const [items, optimisticallyRemoveCampaign] = useOptimistic(campaigns.data, (state, id: string) =>
		state.filter((c) => c.id !== id),
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [isDeletePending, startDeleteTransition] = useTransition();
	const search = useUrlPaginatedSearch({ page: initialPage, q: initialQ });

	return (
		<Fragment>
			<EntityListHeader
				title={t("Reporting campaigns")}
				description={t("Manage all reporting campaigns in the DARIAH knowledge base.")}
				action={
					<>
						<EntityListSearchField search={search} />
						<NewLink href="/dashboard/administrator/reporting-campaigns/create">{t("New")}</NewLink>
					</>
				}
			/>

			<Table
				aria-label="reporting campaigns"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Year")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn>{t("Reports")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => (
						<TableRow id={item.id}>
							<TableCell>{item.year}</TableCell>
							<TableCell>{item.status}</TableCell>
							<TableCell>{item.reportCount}</TableCell>
							<TableCell className="text-end">
								<RowActionsMenu>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/reporting-campaigns/${item.id}/edit`}
										icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
									>
										{t("Edit")}
									</RowActionsMenu.Link>
									<RowActionsMenu.Separator />
									<RowActionsMenu.Action
										danger={true}
										icon={<TrashIcon className="me-2 block-4 inline-4" />}
										isDisabled={item.hasReports}
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

			<EntityListPagination search={search} total={campaigns.total} pageSize={pageSize} />

			<EntityDeleteModal
				item={itemToDelete}
				model={t("reporting campaign")}
				isPending={isDeletePending}
				error={deleteError}
				onClose={() => {
					setItemToDelete(null);
					setDeleteError(null);
				}}
				onConfirm={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;
					setDeleteError(null);

					startDeleteTransition(async () => {
						optimisticallyRemoveCampaign(id);
						try {
							await deleteReportingCampaignAction(id);
							router.refresh();
							setItemToDelete(null);
						} catch {
							setDeleteError(t("Could not delete reporting campaign. Please try again."));
						}
					});
				}}
			/>
		</Fragment>
	);
}
