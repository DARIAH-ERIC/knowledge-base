"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Badge } from "@dariah-eric/ui/badge";
import { Button, buttonStyles } from "@dariah-eric/ui/button";
import { Link } from "@dariah-eric/ui/link";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@dariah-eric/ui/menu";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
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
import { Fragment, type ReactNode, startTransition, use, useState } from "react";
import { useFilter, useListData } from "react-aria-components";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { deleteServiceAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_lib/delete-service.action";

interface ServicesPageProps {
	services: Promise<
		Array<
			Pick<schema.Service, "id" | "name" | "sshocMarketplaceId"> & {
				type: Pick<schema.ServiceType, "type">;
				status: Pick<schema.ServiceStatus, "status">;
			}
		>
	>;
}

function formatServiceStatus(status: string): string {
	return status.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => {
		return c.toUpperCase();
	});
}

function statusIntent(status: string): "success" | "warning" | "danger" | "info" {
	switch (status) {
		case "live": {
			return "success";
		}
		case "needs_review": {
			return "warning";
		}
		case "discontinued": {
			return "danger";
		}
		case "to_be_discontinued": {
			return "warning";
		}
		default: {
			return "info";
		}
	}
}

export function ServicesPage(props: Readonly<ServicesPageProps>): ReactNode {
	const { services: servicesPromise } = props;

	const services = use(servicesPromise);

	const t = useExtracted();

	const { contains } = useFilter({ sensitivity: "base" });

	const list = useListData({
		filter(item, filterText) {
			return contains(item.name, filterText);
		},
		initialItems: services,
		getKey(item) {
			return item.id;
		},
	});

	const [page, setPage] = useState(1);

	const pageSize = 10;
	const pages = Math.ceil(list.items.length / pageSize);
	const items = list.items.slice((page - 1) * pageSize, page * pageSize);

	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Services")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all services in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField
						onChange={(value) => {
							list.setFilterText(value);
							setPage(1);
						}}
						value={list.filterText}
					>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/services/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="services"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Name")}</TableColumn>
					<TableColumn>{t("Type")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn>{t("SSHOC ID")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow id={item.id}>
								<TableCell>{item.name}</TableCell>
								<TableCell>{item.type.type}</TableCell>
								<TableCell>
									<Badge intent={statusIntent(item.status.status)}>
										{formatServiceStatus(item.status.status)}
									</Badge>
								</TableCell>
								<TableCell>{item.sshocMarketplaceId ?? "—"}</TableCell>
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
											<MenuItem href={`/dashboard/administrator/services/${item.id}/edit`}>
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

			<Paginate page={page} setPage={setPage} total={pages} />

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("service")}
				onAction={() => {
					if (itemToDelete == null) return;

					startTransition(async () => {
						await deleteServiceAction(itemToDelete.id);
						list.remove(itemToDelete.id);
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
