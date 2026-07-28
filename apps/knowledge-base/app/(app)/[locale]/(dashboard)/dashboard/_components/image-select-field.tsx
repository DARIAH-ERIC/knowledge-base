"use client";

import type { ImageCaptionMode } from "@dariah-eric/database/image-captions";
import type { AssetPrefix } from "@dariah-eric/storage/config";
import { Button } from "@dariah-eric/ui/button";
import { buttonStyles } from "@dariah-eric/ui/button-styles";
import { fieldErrorStyles, labelStyles } from "@dariah-eric/ui/field";
import { InlineRichTextEditor } from "@dariah-eric/ui/inline-rich-text-editor";
import { InlineRichTextRenderer } from "@dariah-eric/ui/inline-rich-text-renderer";
import { toPlainText } from "@dariah-eric/ui/rich-text";
import { ToggleGroup, ToggleGroupItem } from "@dariah-eric/ui/toggle-group";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { type ReactNode, useState } from "react";

import { AssetPreview } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/asset-preview";
import type { MediaLibraryAsset } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-asset";
import { MediaLibraryDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/media-library-dialog";
import { EditAssetMetadataDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/edit-asset-metadata-dialog";

/**
 * The selected asset as the form knows it. Only `key` and `url` are needed to submit and preview
 * the selection; the rest is metadata the field surfaces so authors can see - and correct - what
 * they picked without leaving the form.
 */
export interface SelectedImage {
	key: string;
	url: string;
	id?: string | null;
	label?: string | null;
	alt?: string | null;
	caption?: JSONContent | null;
	license?: { code: string; name: string } | null;
	licenseId?: string | null;
	mimeType?: string | null;
}

interface ImageSelectFieldProps<T extends AssetPrefix> {
	allowRemove?: boolean;
	/** Initial per-entity caption, used when {@link captionName} is set. */
	defaultCaption?: JSONContent | null;
	/** Initial caption behaviour, used when {@link captionName} is set. */
	defaultCaptionMode?: ImageCaptionMode;
	/**
	 * Enables the caption-behaviour controls, posting the caption as JSON under this name and the
	 * mode under `${captionName}Mode`. Omit it for images that never carry a caption (portraits,
	 * logos).
	 */
	captionName?: string;
	defaultPrefix: T;
	initialAssets: Array<MediaLibraryAsset>;
	isRequired?: boolean;
	name?: string;
	onChange: (image: SelectedImage | null) => void;
	prefixes: ReadonlyArray<T>;
	selectedImage: SelectedImage | null;
}

export function ImageSelectField<T extends AssetPrefix>(
	props: Readonly<ImageSelectFieldProps<T>>,
): ReactNode {
	const {
		allowRemove = false,
		captionName,
		defaultCaption = null,
		defaultCaptionMode = "inherit",
		defaultPrefix,
		initialAssets,
		isRequired = false,
		name = "imageKey",
		onChange,
		prefixes,
		selectedImage,
	} = props;

	const t = useExtracted();
	const [error, setError] = useState(false);
	const [captionMode, setCaptionMode] = useState<ImageCaptionMode>(defaultCaptionMode);

	function handleChange(image: SelectedImage | null) {
		onChange(image);
		setError(false);
	}

	const assetCaption = selectedImage?.caption ?? null;
	const hasAssetCaption = assetCaption != null && toPlainText(assetCaption) !== "";

	return (
		<>
			{selectedImage != null ? (
				<div className="flex flex-col gap-y-4 rounded-lg border border-border p-3">
					<div className="flex flex-row flex-wrap items-start gap-x-4 gap-y-3">
						<div className="block-24 inline-32 shrink-0 overflow-hidden rounded-md bg-muted">
							<AssetPreview
								alt={selectedImage.alt ?? selectedImage.label ?? t("Selected image")}
								className="block-full inline-full"
								imageClassName="object-contain"
								kindLabelClassName="bg-background/90 text-xs"
								mimeType={selectedImage.mimeType ?? undefined}
								src={selectedImage.url}
								storageKey={selectedImage.key}
							/>
						</div>

						<div className="flex min-inline-0 flex-1 flex-col gap-y-1.5">
							<span className="truncate font-medium text-sm/tight">
								{selectedImage.label ?? selectedImage.key}
							</span>

							<span className="line-clamp-2 text-muted-fg text-xs">
								<span className="font-medium">{t("Alt text")}:</span>{" "}
								{selectedImage.alt != null && selectedImage.alt !== "" ? selectedImage.alt : "—"}
							</span>

							<span className="line-clamp-2 text-muted-fg text-xs">
								<span className="font-medium">{t("Caption")}:</span>{" "}
								{hasAssetCaption ? toPlainText(assetCaption) : "—"}
							</span>

							<div className="flex flex-row flex-wrap items-center gap-x-1.5 text-muted-fg text-xs">
								{selectedImage.license != null ? <span>{selectedImage.license.code}</span> : null}
								{selectedImage.license != null && selectedImage.mimeType != null ? (
									<span aria-hidden={true}>{"·"}</span>
								) : null}
								{selectedImage.mimeType != null ? <span>{selectedImage.mimeType}</span> : null}
							</div>
						</div>
					</div>

					<div className="flex flex-row flex-wrap items-center gap-2">
						<MediaLibraryDialog
							defaultPrefix={defaultPrefix}
							initialAssets={initialAssets}
							onSelect={(key, url, asset) => {
								handleChange({ key, url, ...asset });
							}}
							prefixes={prefixes}
							triggerLabel={t("Change image")}
						/>

						{selectedImage.id != null ? (
							<EditAssetMetadataDialog
								asset={{
									id: selectedImage.id,
									key: selectedImage.key,
									label: selectedImage.label ?? selectedImage.key,
									alt: selectedImage.alt ?? null,
									caption: selectedImage.caption ?? null,
									licenseId: selectedImage.licenseId ?? null,
									mimeType: selectedImage.mimeType ?? "",
									url: selectedImage.url,
								}}
								onSuccess={(saved) => {
									/* The asset row changed under us; mirror it locally so the card shows what was
									   just saved without discarding the rest of the form. */
									handleChange({ ...selectedImage, ...saved });
								}}
								trigger={({ open }) => (
									<Button intent="outline" onPress={open}>
										{t("Edit metadata")}
									</Button>
								)}
							/>
						) : null}

						{/* The preview above is a resized derivative; this serves the original bytes. */}
						<a
							className={buttonStyles({ intent: "plain" })}
							download={true}
							href={`/api/assets/download?key=${encodeURIComponent(selectedImage.key)}`}
						>
							<ArrowDownTrayIcon aria-hidden={true} className="block-4 inline-4" />
							{t("Download original")}
						</a>

						{allowRemove ? (
							<Button
								intent="outline"
								onPress={() => {
									handleChange(null);
								}}
							>
								{t("Remove image")}
							</Button>
						) : null}
					</div>

					{captionName != null ? (
						<div className="flex flex-col gap-y-2 border-border border-bs pbs-3">
							<span className={labelStyles()}>{t("Caption behavior")}</span>

							<ToggleGroup
								aria-label={t("Caption behavior")}
								disallowEmptySelection={true}
								onSelectionChange={(keys) => {
									const [mode] = [...keys] as Array<ImageCaptionMode>;
									if (mode != null) {
										setCaptionMode(mode);
									}
								}}
								selectedKeys={new Set([captionMode])}
								selectionMode="single"
								size="sm"
							>
								<ToggleGroupItem id="inherit">{t("Use asset caption")}</ToggleGroupItem>
								<ToggleGroupItem id="override">{t("Custom caption")}</ToggleGroupItem>
								<ToggleGroupItem id="hidden">{t("No caption")}</ToggleGroupItem>
							</ToggleGroup>

							<input name={`${captionName}Mode`} type="hidden" value={captionMode} />

							{captionMode === "inherit" ? (
								hasAssetCaption ? (
									<InlineRichTextRenderer
										className="rounded-lg border border-border px-3 py-2 text-muted-fg text-sm"
										content={assetCaption}
									/>
								) : (
									<p className="text-muted-fg text-xs">
										{t("This asset has no caption, so no caption will be shown.")}
									</p>
								)
							) : null}

							{/* Always mounted - the editor takes its content once, so unmounting it while the
							    author switches modes would throw away what they typed. */}
							<div className={captionMode === "override" ? undefined : "hidden"}>
								<InlineRichTextEditor
									aria-label={t("Custom caption")}
									content={defaultCaption ?? undefined}
									name={captionName}
								/>
							</div>
						</div>
					) : null}
				</div>
			) : (
				<MediaLibraryDialog
					defaultPrefix={defaultPrefix}
					initialAssets={initialAssets}
					onSelect={(key, url, asset) => {
						handleChange({ key, url, ...asset });
					}}
					prefixes={prefixes}
				/>
			)}

			<input
				aria-hidden={true}
				className="sr-only"
				name={name}
				onChange={(event) => {
					event.currentTarget.setCustomValidity("");
				}}
				onInvalid={(event) => {
					event.preventDefault();
					setError(true);
				}}
				required={isRequired}
				tabIndex={-1}
				value={selectedImage?.key ?? ""}
			/>
			{error ? <div className={fieldErrorStyles()}>{t("Please select an image.")}</div> : null}
		</>
	);
}
