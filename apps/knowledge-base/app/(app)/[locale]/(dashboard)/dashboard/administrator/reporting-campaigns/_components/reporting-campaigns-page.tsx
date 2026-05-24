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
import { Fragment, type ReactNode, startTransition, use, useOptimistic, useState } from "react";

import {
	EntityDeleteModal,
	EntityListHeader,
	NewLink,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { deleteReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/delete-reporting-campaign.action";
import { useRouter } from "@/lib/navigation/navigation";

interface ReportingCampaignsPageProps {
	campaigns: Promise<
		Array<
			Pick<schema.ReportingCampaign, "id" | "year" | "status"> & {
				hasReports: boolean;
				reportCount: number;
			}
		>
	>;
}

export function ReportingCampaignsPage(props: Readonly<ReportingCampaignsPageProps>): ReactNode {
	const { campaigns: campaignsPromise } = props;

	const resolvedCampaigns = use(campaignsPromise);

	const t = useExtracted();
	const router = useRouter();
	const [campaigns, optimisticallyRemoveCampaign] = useOptimistic(
		resolvedCampaigns,
		(state, id: string) => state.filter((c) => c.id !== id),
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);

	return (
		<Fragment>
			<EntityListHeader
				title={t("Reporting campaigns")}
				description={t("Manage all reporting campaigns in the DARIAH knowledge base.")}
				action={
					<NewLink href="/dashboard/administrator/reporting-campaigns/create">{t("New")}</NewLink>
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
				<TableBody items={campaigns}>
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

			<EntityDeleteModal
				item={itemToDelete}
				model={t("reporting campaign")}
				isPending={false}
				onClose={() => {
					setItemToDelete(null);
				}}
				onConfirm={() => {
					if (itemToDelete == null) {
						return;
					}

					startTransition(async () => {
						optimisticallyRemoveCampaign(itemToDelete.id);
						await deleteReportingCampaignAction(itemToDelete.id);
						router.refresh();
						setItemToDelete(null);
					});
				}}
			/>
		</Fragment>
	);
}
