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
	EyeIcon,
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
import { deleteProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/delete-project.action";
import { useRouter } from "@/lib/navigation/navigation";

interface ProjectsPageProps {
	page: number;
	projects: {
		data: Array<
			Pick<schema.Project, "acronym" | "duration" | "funding" | "id" | "name"> & {
				entity: Pick<schema.Entity, "slug">;
				scope: Pick<schema.ProjectScope, "id" | "scope">;
			}
		>;
		total: number;
	};
	q: string;
}

const pageSize = 10;

export function ProjectsPage(props: Readonly<ProjectsPageProps>): ReactNode {
	const { page: initialPage, projects, q: initialQ } = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, setItems] = useState(() => {
		return projects.data;
	});
	const [itemToDelete, setItemToDelete] = useState<{ id: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage } = useUrlPaginatedSearch({
		page: initialPage,
		q: initialQ,
	});
	const [isDeletePending, startDeleteTransition] = useTransition();

	const totalPages = Math.max(Math.ceil(projects.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Projects")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all projects in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/projects/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="projects"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Name")}</TableColumn>
					<TableColumn>{t("Acronym")}</TableColumn>
					<TableColumn>{t("Duration")}</TableColumn>
					<TableColumn>{t("Funding")}</TableColumn>
					<TableColumn>{t("Scope")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow href={`/dashboard/administrator/projects/${item.entity.slug}/details`}>
								<TableCell>{item.name}</TableCell>
								<TableCell>{item.acronym}</TableCell>
								<TableCell>
									{item.duration.end
										? format.dateTimeRange(item.duration.start, item.duration.end, {
												dateStyle: "short",
											})
										: format.dateTime(item.duration.start, { dateStyle: "short" })}
								</TableCell>
								<TableCell>
									{item.funding != null
										? format.number(item.funding, { style: "currency", currency: "EUR" })
										: null}
								</TableCell>
								<TableCell>
									<Badge
										intent={
											item.scope.scope === "eu"
												? "danger"
												: item.scope.scope === "national"
													? "info"
													: "warning"
										}
									>
										{item.scope.scope}
									</Badge>
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
												href={`/dashboard/administrator/projects/${item.entity.slug}/details`}
											>
												<EyeIcon className="mr-2 size-4" />
												<MenuLabel>{t("View")}</MenuLabel>
											</MenuItem>
											<MenuItem href={`/dashboard/administrator/projects/${item.entity.slug}/edit`}>
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
				totalItems={projects.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("project")}
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
						await deleteProjectAction(id);
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
