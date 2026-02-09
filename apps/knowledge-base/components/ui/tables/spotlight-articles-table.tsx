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
import type { SpotlightArticlesWithEntities } from "@/lib/data/spotlight-articles";

interface SpotlightArticlesTableProps {
	data: SpotlightArticlesWithEntities;
}

export function SpotlightArticlesTable(props: Readonly<SpotlightArticlesTableProps>): ReactNode {
	const formatter = useFormatter();

	const { data: spotlightArticles } = props;

	return (
		<Container className="py-6 sm:py-16">
			<CardHeader className="mb-6">
				<CardTitle>Spotlight Articles</CardTitle>
				<CardDescription>List of spotlight articles.</CardDescription>
				<CardAction>
					<Button intent="secondary">
						<PlusIcon />
						Add spotlight article
					</Button>
				</CardAction>
			</CardHeader>

			<Table aria-label="Spotlight Articles">
				<TableHeader>
					<TableColumn isRowHeader={true}>Title</TableColumn>
					<TableColumn>Summary</TableColumn>
					<TableColumn>Created at</TableColumn>
					<TableColumn>Updated at</TableColumn>
					<TableColumn className="sticky right-0 z-10 bg-linear-to-l from-bg from-60% text-end" />
				</TableHeader>
				<TableBody items={spotlightArticles.data}>
					{(spotlightArticle) => {
						return (
							<TableRow id={spotlightArticle.id}>
								<TableCell>{spotlightArticle.title}</TableCell>
								<TableCell>{spotlightArticle.summary}</TableCell>
								<TableCell>{formatter.dateTime(new Date(spotlightArticle.createdAt))}</TableCell>
								<TableCell>{formatter.dateTime(new Date(spotlightArticle.updatedAt))}</TableCell>
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
												<MenuLabel>View spotlight article</MenuLabel>
											</MenuItem>
											<MenuItem href="#">
												<PencilSquareIcon />
												<MenuLabel>Edit spotlight article</MenuLabel>
											</MenuItem>
											<MenuSeparator />
											<MenuItem href="#" intent="danger">
												<TrashIcon />
												<MenuLabel>Delete spotlight article</MenuLabel>
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
