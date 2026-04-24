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
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useState, useTransition } from "react";

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
import { deleteCountryAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/countries/_lib/delete-country.action";
import type { CountryMemberObserverStatus } from "@/lib/data/countries";
import { useRouter } from "@/lib/navigation/navigation";

interface CountriesPageProps {
	countries: {
		data: Array<
			Pick<schema.OrganisationalUnit, "id" | "name"> & {
				memberObserverFrom: Date | null;
				memberObserverStatus: CountryMemberObserverStatus;
				memberObserverUntil: Date | null;
				entity: Pick<schema.Entity, "slug">;
			}
		>;
		total: number;
	};
	page: number;
	q: string;
}

function memberObserverStatusIntent(
	status: Exclude<CountryMemberObserverStatus, null>,
): "success" | "warning" {
	return status === "is_member_of" ? "success" : "warning";
}

const pageSize = 10;

export function CountriesPage(props: Readonly<CountriesPageProps>): ReactNode {
	const { countries, page: initialPage, q: initialQ } = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, setItems] = useState(() => {
		return countries.data;
	});
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage } = useUrlPaginatedSearch({
		page: initialPage,
		q: initialQ,
	});
	const [isDeletePending, startDeleteTransition] = useTransition();

	const totalPages = Math.max(Math.ceil(countries.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Countries")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all countries in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/countries/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="countries"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Name")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn>{t("From")}</TableColumn>
					<TableColumn>{t("Until")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow>
								<TableCell>{item.name}</TableCell>
								<TableCell>
									{item.memberObserverStatus != null ? (
										<Badge intent={memberObserverStatusIntent(item.memberObserverStatus)}>
											{item.memberObserverStatus === "is_member_of" ? t("Member") : t("Observer")}
										</Badge>
									) : (
										"—"
									)}
								</TableCell>
								<TableCell>
									{item.memberObserverFrom != null
										? format.dateTime(item.memberObserverFrom, { dateStyle: "short" })
										: "—"}
								</TableCell>
								<TableCell>
									{item.memberObserverStatus == null
										? "—"
										: item.memberObserverUntil != null
											? format.dateTime(item.memberObserverUntil, { dateStyle: "short" })
											: t("present")}
								</TableCell>
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
												href={`/dashboard/administrator/countries/${item.entity.slug}/edit`}
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

			<Paginate
				isPending={isPending}
				page={page}
				setPage={setPage}
				total={totalPages}
				totalItems={countries.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("country")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const id = itemToDelete.id;

					startDeleteTransition(async () => {
						setItems((prev) => {
							return prev.filter((item) => {
								return item.id !== id;
							});
						});
						await deleteCountryAction(id);
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
