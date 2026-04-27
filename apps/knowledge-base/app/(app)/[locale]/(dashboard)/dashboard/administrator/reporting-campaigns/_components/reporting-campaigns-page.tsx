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
import { deleteReportingCampaignAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/delete-reporting-campaign.action";
import { useRouter } from "@/lib/navigation/navigation";

interface ReportingCampaignsPageProps {
	campaigns: Promise<Array<Pick<schema.ReportingCampaign, "id" | "year" | "status">>>;
}

export function ReportingCampaignsPage(props: Readonly<ReportingCampaignsPageProps>): ReactNode {
	const { campaigns: campaignsPromise } = props;

	const resolvedCampaigns = use(campaignsPromise);

	const t = useExtracted();
	const router = useRouter();
	const [campaigns, optimisticallyRemoveCampaign] = useOptimistic(
		resolvedCampaigns,
		(state, id: string) => {
			return state.filter((c) => {
				return c.id !== id;
			});
		},
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Reporting campaigns")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all reporting campaigns in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/reporting-campaigns/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="reporting campaigns"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Year")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={campaigns}>
					{(item) => {
						return (
							<TableRow id={item.id}>
								<TableCell>{item.year}</TableCell>
								<TableCell>{item.status}</TableCell>
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
											<MenuItem
												href={`/dashboard/administrator/reporting-campaigns/${item.id}/edit`}
											>
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
				model={t("reporting campaign")}
				onAction={() => {
					if (itemToDelete == null) return;

					startTransition(async () => {
						optimisticallyRemoveCampaign(itemToDelete.id);
						await deleteReportingCampaignAction(itemToDelete.id);
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
