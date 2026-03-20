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
import { deleteProjectAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/projects/_lib/delete-project.action";

interface ProjectsPageProps {
	projects: Promise<
		Array<
			Pick<schema.Project, "acronym" | "duration" | "funding" | "id" | "name"> & {
				entity: Pick<schema.Entity, "documentId" | "slug"> & {
					status: Pick<schema.EntityStatus, "id" | "type">;
				};
				scope: Pick<schema.ProjectScope, "id" | "scope">;
			}
		>
	>;
}

export function ProjectsPage(props: Readonly<ProjectsPageProps>): ReactNode {
	const { projects: projectsPromise } = props;

	const projects = use(projectsPromise);

	const t = useExtracted();
	const format = useFormatter();

	const { contains } = useFilter();

	const list = useListData({
		filter(item, filterText) {
			return contains(item.name, filterText);
		},
		initialItems: projects,
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
					<HeaderTitle>{t("Projects")}</HeaderTitle>
					<HeaderDescription>
						{t("Manage all projects in the DARIAH knowledge base.")}
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
						href="/dashboard/administrator/projects/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="doctors"
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
										? format.dateTimeRange(item.duration.start, item.duration.end)
										: format.dateTime(item.duration.start)}
								</TableCell>
								<TableCell>
									{format.number(item.funding ?? 0, { style: "currency", currency: "EUR" })}
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

			<Paginate page={page} setPage={setPage} total={pages} />

			<DeleteModal
				isOpen={itemToDelete != null}
				model={t("project")}
				onAction={() => {
					if (itemToDelete == null) {
						return;
					}

					startTransition(async () => {
						await deleteProjectAction(itemToDelete.id);
						setItemToDelete(null);
					});
				}}
				onOpenChange={(open) => {
					if (!open) {
						setItemToDelete(null);
					}
				}}
			/>
		</Fragment>
	);
}
