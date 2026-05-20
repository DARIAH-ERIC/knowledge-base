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
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import { DeleteModal } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/delete-modal";
import { EntityLifecycleStatusBadge } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-status-badge";
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
import { dashboardPageSize } from "@/config/pagination.config";
import { useRouter } from "@/lib/navigation/navigation";

interface ProjectsPageProps {
	dir: "asc" | "desc";
	page: number;
	projects: {
		data: Array<
			Pick<schema.Project, "acronym" | "duration" | "funding" | "id" | "name"> & {
				documentId: string;
				entity: Pick<schema.Entity, "slug">;
				hasDraft: boolean;
				isPublished: boolean;
				scope: Pick<schema.ProjectScope, "id" | "scope">;
			}
		>;
		total: number;
	};
	q: string;
	sort: "name" | "acronym" | "funding" | "scope";
}

const pageSize = dashboardPageSize;

export function ProjectsPage(props: Readonly<ProjectsPageProps>): ReactNode {
	const { dir: initialDir, page: initialPage, projects, q: initialQ, sort: initialSort } = props;

	const t = useExtracted();
	const format = useFormatter();
	const router = useRouter();
	const [items, optimisticallyRemoveItem] = useOptimistic(projects.data, (state, id: string) =>
		state.filter((item) => item.id !== id),
	);
	const [itemToDelete, setItemToDelete] = useState<{ id: string; documentId: string } | null>(null);
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
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
						<PlusIcon className="me-2 block-4 inline-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="projects"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="name" isRowHeader={true}>
						{t("Name")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="acronym">
						{t("Acronym")}
					</TableColumn>
					<TableColumn>{t("Duration")}</TableColumn>
					<TableColumn allowsSorting={true} id="funding">
						{t("Funding")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="scope">
						{t("Scope")}
					</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
					{(item) => (
						<TableRow href={`/dashboard/administrator/projects/${item.entity.slug}/details`}>
							<TableCell>
								<div className="max-inline-64 truncate">{item.name}</div>
							</TableCell>
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
							<TableCell>
								<EntityLifecycleStatusBadge
									hasDraft={item.hasDraft}
									isPublished={item.isPublished}
								/>
							</TableCell>
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
										<MenuItem
											href={`/dashboard/administrator/projects/${item.entity.slug}/details`}
										>
											<EyeIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("View")}</MenuLabel>
										</MenuItem>
										<MenuItem href={`/dashboard/administrator/projects/${item.entity.slug}/edit`}>
											<PencilSquareIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("Edit")}</MenuLabel>
										</MenuItem>
										<MenuSeparator />
										<MenuItem
											intent="danger"
											onAction={() => {
												setItemToDelete({ id: item.id, documentId: item.documentId });
											}}
										>
											<TrashIcon className="me-2 block-4 inline-4" />
											<MenuLabel>{t("Delete")}</MenuLabel>
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
				totalItems={projects.total}
			/>

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("project")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					const { id, documentId } = itemToDelete;

					startDeleteTransition(async () => {
						optimisticallyRemoveItem(id);
						await deleteProjectAction(documentId);
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
