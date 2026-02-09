/* eslint-disable react/jsx-no-literals */
"use client";

import {
	EllipsisVerticalIcon,
	IdentificationIcon,
	PencilSquareIcon,
	PlusIcon,
	TrashIcon,
} from "@heroicons/react/16/solid";
import { useFormatter } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { NewsWithEntities } from "@/lib/data/news";

interface NewsTableProps {
	data: NewsWithEntities;
}

export function NewsTable(props: Readonly<NewsTableProps>): ReactNode {
	const formatter = useFormatter();

	const { data: news } = props;

	return (
		<Container className="py-6 sm:py-16">
			<CardHeader className="mb-6">
				<CardTitle>News</CardTitle>
				<CardDescription>List of news.</CardDescription>
				<CardAction>
					<Button intent="secondary">
						<PlusIcon />
						Add news
					</Button>
				</CardAction>
			</CardHeader>

			<Table aria-label="News">
				<TableHeader>
					<TableColumn isRowHeader={true}>Title</TableColumn>
					<TableColumn>Summary</TableColumn>
					<TableColumn>Created at</TableColumn>
					<TableColumn>Updated at</TableColumn>
					<TableColumn className="sticky right-0 z-10 bg-linear-to-l from-bg from-60% text-end" />
				</TableHeader>
				<TableBody items={news.data}>
					{(newsItem) => {
						return (
							<TableRow id={newsItem.id}>
								<TableCell>{newsItem.title}</TableCell>
								<TableCell>{newsItem.summary}</TableCell>
								<TableCell>{formatter.dateTime(new Date(newsItem.createdAt))}</TableCell>
								<TableCell>{formatter.dateTime(new Date(newsItem.updatedAt))}</TableCell>
								<TableCell className="sticky right-0 z-10 bg-linear-to-l from-bg from-60% text-end">
									<Menu>
										<Button className="sm:w-7" intent="plain" size="sq-sm">
											<EllipsisVerticalIcon />
										</Button>
										<MenuContent
											className="min-w-46"
											placement="left top"
											popover={{
												className: "dark:bg-overlay/10 dark:backdrop-blur-xl",
											}}
										>
											<MenuItem href="#">
												<IdentificationIcon />
												<MenuLabel>View news item</MenuLabel>
											</MenuItem>
											<MenuItem href="#">
												<PencilSquareIcon />
												<MenuLabel>Edit news item</MenuLabel>
											</MenuItem>
											<MenuSeparator />
											<MenuItem href="#" intent="danger">
												<TrashIcon />
												<MenuLabel>Delete news item</MenuLabel>
											</MenuItem>
										</MenuContent>
									</Menu>
								</TableCell>
							</TableRow>
						);
					}}
				</TableBody>
			</Table>
		</Container>
	);
}
