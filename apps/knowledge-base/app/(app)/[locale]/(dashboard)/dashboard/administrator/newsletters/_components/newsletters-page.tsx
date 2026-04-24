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
import type { NewslettersResult } from "@/lib/data/newsletters";

interface NewslettersPageProps {
	newsletters: NewslettersResult;
	page: number;
	q: string;
}

const pageSize = 10;

export function NewslettersPage(props: Readonly<NewslettersPageProps>): ReactNode {
	const { newsletters, page: initialPage, q: initialQ } = props;

	const t = useExtracted();
	const format = useFormatter();
	const { inputValue, isPending, page, setInputValue, setPage } = useUrlPaginatedSearch({
		page: initialPage,
		q: initialQ,
	});

	const totalPages = Math.max(Math.ceil(newsletters.total / pageSize), 1);

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
					<SearchField onChange={setInputValue} value={inputValue}>
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
				<TableBody items={newsletters.data}>
					{(item) => {
						return (
							<TableRow>
								<TableCell>{item.settings.subject_line}</TableCell>
								<TableCell>
									{item.send_time
										? format.dateTime(new Date(item.send_time), { dateStyle: "short" })
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

			<Paginate
				isPending={isPending}
				page={page}
				setPage={setPage}
				total={totalPages}
				totalItems={newsletters.total}
			/>
		</Fragment>
	);
}
