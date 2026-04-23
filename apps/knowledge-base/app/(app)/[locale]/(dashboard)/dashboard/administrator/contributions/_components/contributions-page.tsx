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
import { Fragment, type ReactNode, use, useState } from "react";
import { useFilter, useListData } from "react-aria-components";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";

interface Contribution {
	id: string;
	personName: string;
	roleType: string;
	organisationalUnitName: string;
	organisationalUnitType: string;
	durationStart: Date;
	durationEnd: Date | undefined;
}

interface ContributionsPageProps {
	contributions: Promise<Array<Contribution>>;
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

export function ContributionsPage(props: Readonly<ContributionsPageProps>): ReactNode {
	const { contributions: contributionsPromise } = props;

	const contributions = use(contributionsPromise);

	const t = useExtracted();
	const format = useFormatter();

	const { contains } = useFilter({ sensitivity: "base" });

	const list = useListData({
		filter(item, filterText) {
			return (
				contains(item.personName, filterText) ||
				contains(item.organisationalUnitName, filterText) ||
				contains(item.organisationalUnitType, filterText) ||
				contains(item.roleType, filterText)
			);
		},
		initialItems: contributions,
		getKey(item) {
			return item.id;
		},
	});

	const [page, setPage] = useState(1);

	const pageSize = 20;
	const pages = Math.ceil(list.items.length / pageSize);
	const items = list.items.slice((page - 1) * pageSize, page * pageSize);

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
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Person")}</TableColumn>
					<TableColumn>{t("Role")}</TableColumn>
					<TableColumn>{t("Type")}</TableColumn>
					<TableColumn>{t("Name")}</TableColumn>
					<TableColumn>{t("From")}</TableColumn>
					<TableColumn>{t("Until")}</TableColumn>
					<TableColumn />
				</TableHeader>
				<TableBody items={items}>
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

			<Paginate page={page} setPage={setPage} total={pages} />
		</Fragment>
	);
}
