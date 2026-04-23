"use client";

import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
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
	durationStart: Date;
	durationEnd: Date | undefined;
}

interface ContributionsPageProps {
	contributions: Promise<Array<Contribution>>;
}

function formatRoleType(type: string): string {
	return type.replaceAll("_", " ");
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
						{t("All person-to-organisation contributions in the DARIAH knowledge base.")}
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
				</HeaderAction>
			</Header>

			<Table
				aria-label="contributions"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Person")}</TableColumn>
					<TableColumn>{t("Role")}</TableColumn>
					<TableColumn>{t("Organisation")}</TableColumn>
					<TableColumn>{t("From")}</TableColumn>
					<TableColumn>{t("Until")}</TableColumn>
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow id={item.id}>
								<TableCell>{item.personName}</TableCell>
								<TableCell>{formatRoleType(item.roleType)}</TableCell>
								<TableCell>{item.organisationalUnitName}</TableCell>
								<TableCell>{format.dateTime(item.durationStart, { dateStyle: "short" })}</TableCell>
								<TableCell>
									{item.durationEnd != null
										? format.dateTime(item.durationEnd, { dateStyle: "short" })
										: t("present")}
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
