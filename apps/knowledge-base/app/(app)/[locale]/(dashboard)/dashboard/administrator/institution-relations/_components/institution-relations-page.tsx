"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { Button } from "@dariah-eric/ui/button";
import { DatePicker, DatePickerTrigger } from "@dariah-eric/ui/date-picker";
import { Label } from "@dariah-eric/ui/field";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { ArchiveBoxXMarkIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { type CalendarDate, getLocalTimeZone } from "@internationalized/date";
import { useExtracted, useFormatter } from "next-intl";
import { Fragment, type ReactNode, useOptimistic, useState, useTransition } from "react";

import {
	EntityListHeader,
	EntityListPagination,
	EntityListSearchField,
	RowActionsMenu,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-list";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { endUnitRelationAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/_lib/end-unit-relation.action";
import { dashboardPageSize } from "@/config/pagination.config";
import type { InstitutionRelationsResult } from "@/lib/data/institution-relations";

interface InstitutionRelationsPageProps {
	institutionRelations: InstitutionRelationsResult;
	dir: "asc" | "desc";
	page: number;
	q: string;
	sort:
		| "institutionName"
		| "statusType"
		| "relatedUnitName"
		| "relatedUnitType"
		| "durationStart"
		| "durationEnd";
}

function formatValue(value: string): string {
	return value.replaceAll("_", " ");
}

function organisationalUnitTypeIntent(
	type: string,
): "amber" | "emerald" | "info" | "pink" | "rose" | "secondary" | "slate" | "violet" {
	switch (type) {
		case "country": {
			return "info";
		}
		case "eric": {
			return "rose";
		}
		case "governance_body": {
			return "slate";
		}
		case "institution": {
			return "emerald";
		}
		case "national_consortium": {
			return "amber";
		}
		case "regional_hub": {
			return "violet";
		}
		case "working_group": {
			return "pink";
		}
		default: {
			return "secondary";
		}
	}
}

const pageSize = dashboardPageSize;

interface EndRelationAction {
	end: Date;
	id: string;
}

export function InstitutionRelationsPage(
	props: Readonly<InstitutionRelationsPageProps>,
): ReactNode {
	const {
		institutionRelations,
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const [items, optimisticallyEndItem] = useOptimistic(
		institutionRelations.data,
		(state, action: EndRelationAction) =>
			state.map((relation) =>
				relation.id === action.id ? { ...relation, durationEnd: action.end } : relation,
			),
	);
	const [itemToEnd, setItemToEnd] = useState<{ id: string } | null>(null);
	const [selectedEndDate, setSelectedEndDate] = useState<CalendarDate | null>(null);
	const search = useUrlPaginatedSearch({
		dir: initialDir,
		page: initialPage,
		q: initialQ,
		sort: initialSort,
	});
	const [isEndPending, startEndTransition] = useTransition();

	return (
		<Fragment>
			<EntityListHeader
				title={t("Institution relations")}
				description={t(
					"Review dated institution-to-organisation relations and manage them from institution edit pages.",
				)}
				action={<EntityListSearchField search={search} />}
			/>

			<Table
				aria-label="institution relations"
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
				onSortChange={search.setSortDescriptor}
				sortDescriptor={search.sortDescriptor}
			>
				<TableHeader>
					<TableColumn allowsSorting={true} id="institutionName" isRowHeader={true}>
						{t("Institution")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="statusType">
						{t("Relation")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="relatedUnitType">
						{t("Type")}
					</TableColumn>
					<TableColumn allowsSorting={true} id="relatedUnitName">
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
				<TableBody items={items}>
					{(item) => (
						<TableRow id={item.id}>
							<TableCell>{item.institutionName}</TableCell>
							<TableCell>{formatValue(item.statusType)}</TableCell>
							<TableCell>
								<Badge intent={organisationalUnitTypeIntent(item.relatedUnitType)}>
									{formatValue(item.relatedUnitType)}
								</Badge>
							</TableCell>
							<TableCell>{item.relatedUnitName}</TableCell>
							<TableCell>{format.dateTime(item.durationStart, { dateStyle: "short" })}</TableCell>
							<TableCell>
								{item.durationEnd != null
									? format.dateTime(item.durationEnd, { dateStyle: "short" })
									: t("present")}
							</TableCell>
							<TableCell className="text-end">
								<RowActionsMenu>
									<RowActionsMenu.Link
										href={`/dashboard/administrator/institutions/${item.institutionSlug}/edit`}
										icon={<PencilSquareIcon className="me-2 block-4 inline-4" />}
									>
										{t("Edit institution")}
									</RowActionsMenu.Link>
									{item.durationEnd == null ? (
										<Fragment>
											<RowActionsMenu.Separator />
											<RowActionsMenu.Action
												icon={<ArchiveBoxXMarkIcon className="me-2 block-4 inline-4" />}
												onAction={() => {
													setItemToEnd({ id: item.id });
													setSelectedEndDate(null);
												}}
											>
												{t("End relation")}
											</RowActionsMenu.Action>
										</Fragment>
									) : null}
								</RowActionsMenu>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<EntityListPagination
				search={search}
				total={institutionRelations.total}
				pageSize={pageSize}
			/>

			<ModalContent
				isOpen={itemToEnd != null}
				onOpenChange={(open) => {
					if (!open && !isEndPending) {
						setItemToEnd(null);
					}
				}}
				role="alertdialog"
				size="sm"
			>
				<ModalHeader
					description={t("Set the date on which this institution relation ended.")}
					title={t("End relation")}
				/>
				<ModalBody>
					<DatePicker
						granularity="day"
						onChange={(date) => {
							setSelectedEndDate(date);
						}}
						value={selectedEndDate}
					>
						<Label>{t("End date")}</Label>
						<DatePickerTrigger />
					</DatePicker>
				</ModalBody>
				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>
					<Button
						isDisabled={selectedEndDate == null}
						onPress={() => {
							if (itemToEnd == null || selectedEndDate == null) {
								return;
							}

							const end = selectedEndDate.toDate(getLocalTimeZone());

							startEndTransition(async () => {
								optimisticallyEndItem({ id: itemToEnd.id, end });
								await endUnitRelationAction(itemToEnd.id, end);
								setItemToEnd(null);
							});
						}}
					>
						{t("Confirm")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}
