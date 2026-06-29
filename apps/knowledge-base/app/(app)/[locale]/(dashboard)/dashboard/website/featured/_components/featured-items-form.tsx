"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { AsyncListSelect } from "@dariah-eric/ui/async-list-select";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import type { AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { updateFeaturedItemsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/featured/_lib/update-featured-items.action";
import type { NewsItemOption } from "@/lib/data/news";

const MAX_ALLOWED_FEATURED_ITEMS = 3;

async function fetchNewsItemsPage(
	params: Readonly<AsyncOptionsFetchPageParams>,
): Promise<{ items: Array<NewsItemOption>; total: number }> {
	const searchParams = new URLSearchParams({
		limit: String(params.limit),
		offset: String(params.offset),
	});

	if (params.q !== "") {
		searchParams.set("q", params.q);
	}

	const response = await fetch(`/api/news/options?${searchParams.toString()}`, {
		signal: params.signal,
	});

	if (!response.ok) {
		throw new Error("Failed to load news items.");
	}

	return (await response.json()) as { items: Array<NewsItemOption>; total: number };
}

interface FeaturedItemsFormProps {
	initialFeaturedItemsOptions: { items: Array<NewsItemOption>; total: number };
	/** The currently-featured news items, resolved by id and ordered, for labelling the selection. */
	selectedFeaturedItems: Array<NewsItemOption>;
	featuredItemIds: Array<string>;
}

export function FeaturedItemsForm(props: Readonly<FeaturedItemsFormProps>): ReactNode {
	const { initialFeaturedItemsOptions, selectedFeaturedItems } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(
		updateFeaturedItemsAction,
		createActionStateInitial(),
	);

	const [featuredItemIds, setFeaturedItemIds] = useState<Array<string>>(
		() => props.featuredItemIds,
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection
					description={t("Featured News Items on the landing page. Drag to reorder.")}
					title={t("Featured News Items")}
				>
					<AsyncListSelect
						addLabel={t("Add news item")}
						aria-label={t("Featured news items")}
						emptySelectionMessage={t("No featured items yet.")}
						fetchPage={fetchNewsItemsPage}
						initialItems={initialFeaturedItemsOptions.items}
						initialTotal={initialFeaturedItemsOptions.total}
						isOrderable={true}
						maxItems={MAX_ALLOWED_FEATURED_ITEMS}
						onChange={setFeaturedItemIds}
						selectedItems={selectedFeaturedItems}
						value={featuredItemIds}
					/>
					{featuredItemIds.map((id, index) => (
						<input key={id} name={`featuredItemIds.${String(index)}`} type="hidden" value={id} />
					))}
				</FormSection>

				<div className="flex items-center justify-end gap-x-3">
					<FormStatus className="text-sm" state={state} />

					<Button isPending={isPending} type="submit">
						{isPending ? <span aria-hidden={true}>{t("Saving...")}</span> : t("Save")}
					</Button>
				</div>
			</Form>
		</FormLayout>
	);
}
