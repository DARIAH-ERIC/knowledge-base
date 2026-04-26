"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { Button, buttonStyles } from "@dariah-eric/ui/button";
import { Link } from "@dariah-eric/ui/link";
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
import { EllipsisHorizontalIcon, PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import type { ContributionsResult } from "@/lib/data/contributions";

interface ContributionsPageProps {
	contributions: ContributionsResult;
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort:
		| "personName"
		| "roleType"
		| "organisationalUnitType"
		| "organisationalUnitName"
		| "durationStart"
		| "durationEnd";
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
}

function formatOrganisationalUnitType(type: string): string {
	return type.replaceAll("_", " ");
}

function organisationalUnitTypeIntent(
	type: string,
): "danger" | "info" | "primary" | "secondary" | "success" | "warning" {
	switch (type) {
		case "country": {
			return "info";
		}
		case "eric": {
			return "danger";
		}
		case "governance_body": {
			return "secondary";
		}
		case "institution": {
			return "primary";
		}
		case "national_consortium": {
			return "warning";
		}
		case "regional_hub": {
			return "success";
		}
		case "working_group": {
			return "success";
		}
		default: {
			return "secondary";
		}
	}
}

const pageSize = 20;

export function ContributionsPage(props: Readonly<ContributionsPageProps>): ReactNode {
	const {
		contributions,
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const { inputValue, isPending, page, setInputValue, setPage, setSortDescriptor, sortDescriptor } =
		useUrlPaginatedSearch({
			dir: initialDir,
			page: initialPage,
			q: initialQ,
			sort: initialSort,
		});

	const totalPages = Math.max(Math.ceil(contributions.total / pageSize), 1);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Contributions")}</HeaderTitle>
					<HeaderDescription>
						{t("All person-to-organisation relations in the DARIAH knowledge base.")}
					</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search")} />
					</SearchField>
					<Link
						className={buttonStyles({ intent: "secondary" })}
						href="/dashboard/administrator/contributions/create"
					>
						<PlusIcon className="mr-2 size-4" />
						{t("New")}
					</Link>
				</HeaderAction>
			</Header>

			<Table
				aria-label="contributions"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={setSortDescriptor}
				sortDescriptor={sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="personName" isRowHeader={true}>
						{t("Person")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="roleType">
						{t("Role")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="organisationalUnitType">
						{t("Type")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="organisationalUnitName">
						{t("Name")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="durationStart">
						{t("From")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="durationEnd">
						{t("Until")}
					</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={contributions.data}>
					{(item) => {
						return (
							<TableRow id={item.id}>
								<TableCell>{item.personName}</TableCell>
								<TableCell>{formatRoleType(item.roleType)}</TableCell>
								<TableCell>
									<Badge intent={organisationalUnitTypeIntent(item.organisationalUnitType)}>
										{formatOrganisationalUnitType(item.organisationalUnitType)}
									</Badge>
								</TableCell>
								<TableCell>{item.organisationalUnitName}</TableCell>
								<TableCell>{format.dateTime(item.durationStart, { dateStyle: "short" })}</TableCell>
								<TableCell>
									{item.durationEnd != null
										? format.dateTime(item.durationEnd, { dateStyle: "short" })
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
											<MenuItem href={`/dashboard/administrator/contributions/${item.id}/edit`}>
												<PencilSquareIcon className="mr-2 size-4" />
												<MenuLabel>{t("Edit")}</MenuLabel>
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
				totalItems={contributions.total}
			/>
		</Fragment>
	);
}
