"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { AsyncListSelect } from "@dariah-eric/ui/async-list-select";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import type { AsyncOptionsFetchPageParams } from "@dariah-eric/ui/use-async-options";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import { updateSiteMetadataAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/metadata/_lib/update-site-metadata.action";
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

interface SiteMetadataFormProps {
	initialAssets: Array<{ key: string; label: string; url: string }>;
	initialFeaturedItemsOptions: { items: Array<NewsItemOption>; total: number };
	/** The currently-featured news items, resolved by id and ordered, for labelling the selection. */
	selectedFeaturedItems: Array<NewsItemOption>;
	siteMetadata:
		| (Pick<
				schema.SiteMetadata,
				"title" | "description" | "featuredItemIds" | "ogTitle" | "ogDescription"
		  > & {
				ogImage: { key: string; label: string; url: string } | null;
		  })
		| null;
}

export function SiteMetadataForm(props: Readonly<SiteMetadataFormProps>): ReactNode {
	const { initialAssets, initialFeaturedItemsOptions, selectedFeaturedItems, siteMetadata } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(
		updateSiteMetadataAction,
		createActionStateInitial(),
	);

	const [selectedImage, setSelectedImage] = useState<{ key: string; url: string } | null>(
		siteMetadata?.ogImage ?? null,
	);

	const [featuredItemIds, setFeaturedItemIds] = useState<Array<string>>(
		() => (siteMetadata?.featuredItemIds as Array<string> | null | undefined) ?? [],
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection
					description={t("Default title and description for the website.")}
					title={t("Details")}
				>
					<TextField defaultValue={siteMetadata?.title ?? undefined} isRequired={true} name="title">
						<Label>{t("Title")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField
						defaultValue={siteMetadata?.description ?? undefined}
						isRequired={true}
						name="description"
					>
						<Label>{t("Description")}</Label>
						<TextArea rows={5} />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t(
						"Override title and description for social media previews. Leave blank to use the values above.",
					)}
					title={t("Open Graph")}
				>
					<TextField defaultValue={siteMetadata?.ogTitle ?? undefined} name="ogTitle">
						<Label>{t("OG title")}</Label>
						<Input placeholder={siteMetadata?.title ?? t("Defaults to title")} />
						<FieldError />
					</TextField>

					<TextField defaultValue={siteMetadata?.ogDescription ?? undefined} name="ogDescription">
						<Label>{t("OG description")}</Label>
						<TextArea
							placeholder={siteMetadata?.description ?? t("Defaults to description")}
							rows={3}
						/>
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Image used when the website is shared on social media.")}
					title={t("Open Graph image")}
				>
					{selectedImage != null && (
						<img
							alt={t("Selected OG image")}
							className="block-24 inline-auto max-inline-full rounded-lg object-contain"
							src={selectedImage.url}
						/>
					)}
					<MediaLibraryDialog
						defaultPrefix="images"
						initialAssets={initialAssets}
						onSelect={(key, url) => {
							setSelectedImage({ key, url });
						}}
						prefixes={["avatars", "images", "logos"]}
					/>
					{selectedImage != null ? (
						<Button
							intent="outline"
							onPress={() => {
								setSelectedImage(null);
							}}
						>
							{t("Remove image")}
						</Button>
					) : null}
					<input
						aria-hidden={true}
						className="sr-only"
						name="imageKey"
						readOnly={true}
						tabIndex={-1}
						value={selectedImage?.key ?? ""}
					/>
				</FormSection>

				<Separator className="my-6" />

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
