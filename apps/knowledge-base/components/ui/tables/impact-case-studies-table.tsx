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
import type { ImpactCaseStudiesWithEntities } from "@/lib/data/impact-case-studies";

interface ImpactCaseStudiesTableProps {
	data: ImpactCaseStudiesWithEntities;
}

export function ImpactCaseStudiesTable(props: Readonly<ImpactCaseStudiesTableProps>): ReactNode {
	const formatter = useFormatter();

	const { data: impactCaseStudies } = props;

	return (
		<Container className="py-6 sm:py-16">
			<CardHeader className="mb-6">
				<CardTitle>Impact Case Studies</CardTitle>
				<CardDescription>List of impact case studies.</CardDescription>
				<CardAction>
					<Button intent="secondary">
						<PlusIcon />
						Add impact case study
					</Button>
				</CardAction>
			</CardHeader>

			<Table aria-label="Impact Case Studies">
				<TableHeader>
					<TableColumn isRowHeader={true}>Title</TableColumn>
					<TableColumn>Summary</TableColumn>
					<TableColumn>Created at</TableColumn>
					<TableColumn>Updated at</TableColumn>
					<TableColumn className="sticky right-0 z-10 bg-linear-to-l from-bg from-60% text-end" />
				</TableHeader>
				<TableBody items={impactCaseStudies.data}>
					{(impactCaseStudy) => {
						return (
							<TableRow id={impactCaseStudy.id}>
								<TableCell>{impactCaseStudy.title}</TableCell>
								<TableCell>{impactCaseStudy.summary}</TableCell>
								<TableCell>{formatter.dateTime(new Date(impactCaseStudy.createdAt))}</TableCell>
								<TableCell>{formatter.dateTime(new Date(impactCaseStudy.updatedAt))}</TableCell>
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
												<MenuLabel>View impact case study</MenuLabel>
											</MenuItem>
											<MenuItem href="#">
												<PencilSquareIcon />
												<MenuLabel>Edit impact case study</MenuLabel>
											</MenuItem>
											<MenuSeparator />
											<MenuItem href="#" intent="danger">
												<TrashIcon />
												<MenuLabel>Delete impact case study</MenuLabel>
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
