"use client";

import type * as schema from "@dariah-eric/database/schema";
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
import { deleteSocialMediaAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_lib/delete-social-media.action";
import { useRouter } from "@/lib/navigation/navigation";

interface SocialMediaPageProps {
	dir: "asc" | "desc";
	page: number;
	q: string;
	socialMediaItems: {
		data: Array<
			Pick<schema.SocialMedia, "id" | "name" | "url"> & {
				type: Pick<schema.SocialMediaType, "type">;
			}
		>;
		total: number;
	};
	sort: "name" | "type";
}

const pageSize = 10;

export function SocialMediaPage(props: Readonly<SocialMediaPageProps>): ReactNode {
	const {
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		socialMediaItems,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const router = useRouter();
	const [items, setItems] = useState(() => {
		return socialMediaItems.data;
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

	const totalPages = Math.max(Math.ceil(socialMediaItems.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Social media")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all social media in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/social-media/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="social media"
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
					<TableColumn>{t("URL")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow id={item.id}>
								<TableCell>{item.name}</TableCell>
								<TableCell>{item.type.type}</TableCell>
								<TableCell className="max-w-xs truncate">
									<a className="underline" href={item.url} rel="noreferrer" target="_blank">
										{item.url}
									</a>
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
											<MenuItem href={`/dashboard/administrator/social-media/${item.id}/edit`}>
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
				totalItems={socialMediaItems.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("social media")}
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
						await deleteSocialMediaAction(id);
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
