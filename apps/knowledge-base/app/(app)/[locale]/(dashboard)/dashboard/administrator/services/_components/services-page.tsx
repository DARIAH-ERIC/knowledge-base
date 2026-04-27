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
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { deleteServiceAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/services/_lib/delete-service.action";
import { useRouter } from "@/lib/navigation/navigation";

interface ServicesPageProps {
	dir: "asc" | "desc";
	page: number;
	q: string;
	services: {
		data: Array<
			Pick<schema.Service, "id" | "name" | "sshocMarketplaceId"> & {
				status: Pick<schema.ServiceStatus, "status">;
				type: Pick<schema.ServiceType, "type">;
			}
		>;
		total: number;
	};
	sort: "name" | "type" | "status" | "sshocMarketplaceId";
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

const pageSize = 10;

export function ServicesPage(props: Readonly<ServicesPageProps>): ReactNode {
	const { dir: initialDir, page: initialPage, q: initialQ, services, sort: initialSort } = props;

	const t = useExtracted();
	const router = useRouter();
	const [items, optimisticallyRemoveItem] = useOptimistic(services.data, (state, id: string) => {
		return state.filter((item) => {
			return item.id !== id;
		});
	});
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
		});
	const [isDeletePending, startDeleteTransition] = useTransition();

	const totalPages = Math.max(Math.ceil(services.total / pageSize), 1);

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
					<SearchField onChange={setInputValue} value={inputValue}>
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
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="name" isRowHeader={true}>
						{t("Name")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="type">
						{t("Type")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="status">
						{t("Status")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="sshocMarketplaceId">
						{t("SSHOC ID")}
					</TableColumn>
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

			<Paginate
				isPending={isPending}
				page={page}
				setPage={setPage}
				total={totalPages}
				totalItems={services.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("service")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;

					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						await deleteServiceAction(id);
						router.refresh();
						setItemToDelete(null);
					});
				}}
				onOpenChange={(open) => {
					if (!open && !isDeletePending) {
						setItemToDelete(null);
					}
				}}
			/>
		</Fragment>
	);
}
