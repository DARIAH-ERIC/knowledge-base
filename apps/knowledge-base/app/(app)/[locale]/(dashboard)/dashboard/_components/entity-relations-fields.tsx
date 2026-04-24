"use client";

import { Separator } from "@dariah-eric/ui/separator";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";

import { AsyncMultipleSelect } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/async-multiple-select";
import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type {
	AsyncOption,
	AsyncOptionsFetchPageParams,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-async-options";

interface EntityRelationsFieldsProps {
	initialRelatedEntityIds?: Array<string>;
	initialRelatedEntityItems: Array<AsyncOption>;
	initialRelatedEntityTotal: number;
	initialRelatedResourceIds?: Array<string>;
	initialRelatedResourceItems: Array<AsyncOption>;
	initialRelatedResourceTotal: number;
	selectedRelatedEntities?: Array<AsyncOption>;
	selectedRelatedResources?: Array<AsyncOption>;
}

async function fetchRelationOptionsPage(
	resource: "entities" | "resources",
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<AsyncOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/relations/${resource}?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error(`Failed to load ${resource}.`);
	}

	return (await response.json()) as { items: Array<AsyncOption>; total: number };
}

export function EntityRelationsFields(props: Readonly<EntityRelationsFieldsProps>): ReactNode {
	const {
		initialRelatedEntityIds,
		initialRelatedEntityItems,
		initialRelatedEntityTotal,
		initialRelatedResourceIds,
		initialRelatedResourceItems,
		initialRelatedResourceTotal,
		selectedRelatedEntities,
		selectedRelatedResources,
	} = props;

	const t = useExtracted();

	const [selectedEntityIds, setSelectedEntityIds] = useState<Array<string>>(() => {
		return (
			initialRelatedEntityIds ??
			selectedRelatedEntities?.map((item) => {
				return item.id;
			}) ??
			[]
		);
	});
	const [selectedResourceIds, setSelectedResourceIds] = useState<Array<string>>(() => {
		return (
			initialRelatedResourceIds ??
			selectedRelatedResources?.map((item) => {
				return item.id;
			}) ??
			[]
		);
	});

	return (
		<Fragment>
			<FormSection description={t("Link related entities.")} title={t("Related entities")}>
				<AsyncMultipleSelect
					aria-label={t("Related entities")}
					emptyMessage={t("No related entities found.")}
					fetchPage={(params) => {
						return fetchRelationOptionsPage("entities", params);
					}}
					initialItems={initialRelatedEntityItems}
					initialTotal={initialRelatedEntityTotal}
					onChange={(ids) => {
						setSelectedEntityIds(ids);
					}}
					placeholder={t("No related entities")}
					selectedItems={selectedRelatedEntities}
					value={selectedEntityIds}
				/>
				{selectedEntityIds.map((entityId, index) => {
					return (
						<input
							key={entityId}
							name={`relatedEntityIds.${String(index)}`}
							type="hidden"
							value={entityId}
						/>
					);
				})}
			</FormSection>

			<Separator className="my-6" />

			<FormSection description={t("Link related resources.")} title={t("Related resources")}>
				<AsyncMultipleSelect
					aria-label={t("Related resources")}
					emptyMessage={t("No related resources found.")}
					fetchPage={(params) => {
						return fetchRelationOptionsPage("resources", params);
					}}
					initialItems={initialRelatedResourceItems}
					initialTotal={initialRelatedResourceTotal}
					onChange={(ids) => {
						setSelectedResourceIds(ids);
					}}
					placeholder={t("No related resources")}
					selectedItems={selectedRelatedResources}
					value={selectedResourceIds}
				/>
				{selectedResourceIds.map((resourceId, index) => {
					return (
						<input
							key={resourceId}
							name={`relatedResourceIds.${String(index)}`}
							type="hidden"
							value={resourceId}
						/>
					);
				})}
			</FormSection>
		</Fragment>
	);
}
