"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Badge } from "@dariah-eric/ui/badge";
import { Button } from "@dariah-eric/ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@dariah-eric/ui/menu";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { EllipsisHorizontalIcon, EyeIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useOptimistic } from "react";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { dashboardPageSize } from "@/config/pagination.config";

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
	return status.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase());
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

const pageSize = dashboardPageSize;

export function ServicesPage(props: Readonly<ServicesPageProps>): ReactNode {
	const { dir: initialDir, page: initialPage, q: initialQ, services, sort: initialSort } = props;

	const t = useExtracted();
	const [items] = useOptimistic(services.data, (state, id: string) =>
		state.filter((item) => item.id !== id),
	);
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
		});

	const totalPages = Math.max(Math.ceil(services.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Services")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all SSHOC services in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
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
					{(item) => (
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
										className="block-7 sm:block-7"
										intent="plain"
										size="sq-sm"
									>
										<EllipsisHorizontalIcon className="block-5 inline-5" />
									</Button>
									<MenuContent placement="left top">
										<MenuItem href={`/dashboard/administrator/sshoc-services/${item.id}/view`}>
											<EyeIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("View")}</MenuLabel>
										</MenuItem>
									</MenuContent>
								</Menu>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<Paginate
				isPending={isPending}
				page={page}
				setPage={setPage}
				total={totalPages}
				totalItems={services.total}
			/>
		</Fragment>
	);
}
