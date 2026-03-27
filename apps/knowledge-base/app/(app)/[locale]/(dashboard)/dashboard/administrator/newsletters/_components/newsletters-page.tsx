"use client";

import { Badge } from "@dariah-eric/ui/badge";
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
import type { GetCampaignsResponse } from "@/lib/mailchimp";

interface NewslettersPageProps {
	newsletters: Promise<GetCampaignsResponse>;
}

export function NewslettersPage(props: Readonly<NewslettersPageProps>): ReactNode {
	const { newsletters: newslettersPromise } = props;

	const { campaigns: newsletters } = use(newslettersPromise);

	const t = useExtracted();
	const format = useFormatter();

	const { contains } = useFilter({ sensitivity: "base" });

	const list = useListData({
		filter(item, filterText) {
			return contains(item.settings.subject_line, filterText);
		},
		initialItems: newsletters,
	});

	const sorted = list.items.toSorted((a, z) => {
		return z.send_time.localeCompare(a.send_time);
	});

	const [page, setPage] = useState(1);

	const pageSize = 10;
	const pages = Math.ceil(sorted.length / pageSize);
	const items = sorted.slice((page - 1) * pageSize, page * pageSize);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Newsletters")}</HeaderTitle>
					<HeaderDescription>
						{t("View all newsletters in the DARIAH knowledge base.")}
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
				aria-label="newsletters"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn isRowHeader={true}>{t("Title")}</TableColumn>
					<TableColumn>{t("Send time")}</TableColumn>
					<TableColumn>{t("Emails sent")}</TableColumn>
					<TableColumn>{t("URL")}</TableColumn>
					<TableColumn>{t("Status")}</TableColumn>
					<TableColumn>{t("Opens")}</TableColumn>
					<TableColumn>{t("Clicks")}</TableColumn>
				</TableHeader>
				<TableBody items={items}>
					{(item) => {
						return (
							<TableRow>
								<TableCell>{item.settings.subject_line}</TableCell>
								<TableCell>
									{item.send_time
										? format.dateTime(new Date(item.send_time), { dateStyle: "long" })
										: null}
								</TableCell>
								<TableCell>{format.number(item.emails_sent)}</TableCell>
								<TableCell>{item.archive_url}</TableCell>
								<TableCell>
									<Badge intent={item.status === "sent" ? "success" : "primary"}>
										{item.status}
									</Badge>
								</TableCell>
								<TableCell>
									{item.report_summary != null ? (
										<Fragment>
											{format.number(item.report_summary.opens)} (
											{(item.report_summary.open_rate * 100).toFixed(2)}
											{"%"})
										</Fragment>
									) : null}
								</TableCell>
								<TableCell>
									{item.report_summary != null ? (
										<Fragment>
											{format.number(item.report_summary.clicks)} (
											{(item.report_summary.click_rate * 100).toFixed(2)}
											{"%"})
										</Fragment>
									) : null}
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
