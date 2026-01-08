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
import type { EventsWithEntities } from "@/lib/data/events";

interface EventsTableProps {
	data: EventsWithEntities;
}

export function EventsTable(props: Readonly<EventsTableProps>): ReactNode {
	const formatter = useFormatter();

	const { data: events } = props;

	return (
		<Container className="py-6 sm:py-16">
			<CardHeader className="mb-6">
				<CardTitle>Events</CardTitle>
				<CardDescription>List of events.</CardDescription>
				<CardAction>
					<Button intent="secondary">
						<PlusIcon />
						Add event
					</Button>
				</CardAction>
			</CardHeader>

			<Table aria-label="Events">
				<TableHeader>
					<TableColumn isRowHeader={true}>Title</TableColumn>
					<TableColumn>Summary</TableColumn>
					<TableColumn>Created at</TableColumn>
					<TableColumn>Updated at</TableColumn>
					<TableColumn className="sticky right-0 z-10 bg-linear-to-l from-bg from-60% text-end" />
				</TableHeader>
				<TableBody items={events.data}>
					{(event) => {
						return (
							<TableRow id={event.id}>
								<TableCell>{event.title}</TableCell>
								<TableCell>{event.summary}</TableCell>
								<TableCell>{formatter.dateTime(new Date(event.createdAt))}</TableCell>
								<TableCell>{formatter.dateTime(new Date(event.updatedAt))}</TableCell>
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
												<MenuLabel>View event</MenuLabel>
											</MenuItem>
											<MenuItem href="#">
												<PencilSquareIcon />
												<MenuLabel>Edit event</MenuLabel>
											</MenuItem>
											<MenuSeparator />
											<MenuItem href="#" intent="danger">
												<TrashIcon />
												<MenuLabel>Delete event</MenuLabel>
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
