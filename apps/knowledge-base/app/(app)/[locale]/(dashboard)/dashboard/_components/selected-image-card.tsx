"use client";

import { Button } from "@dariah-eric/ui/button";
import { buttonStyles } from "@dariah-eric/ui/button-styles";
import { toPlainText } from "@dariah-eric/ui/rich-text";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import type { JSONContent } from "@tiptap/core";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { AssetPreview } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/asset-preview";
import {
	EditAssetMetadataDialog,
	type SavedAssetMetadata,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/edit-asset-metadata-dialog";

/**
 * A picked asset as an editing screen knows it. Only `key` and `url` are needed to submit and
 * preview the selection; the rest is metadata the card surfaces so authors can see - and correct -
 * what they picked without leaving the form.
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

interface SelectedImageCardProps {
	image: SelectedImage;
	/**
	 * Applies metadata just saved through the card's own edit dialog, so the card reflects the asset
	 * without a page reload. Omit it to hide the edit action.
	 */
	onMetadataChange?: (image: SelectedImage) => void;
	/** Picker, remove button, and anything else specific to the surrounding field. */
	children?: ReactNode;
}

/**
 * Identifies a picked asset: what it is called, what it already says, and how to correct that. The
 * same card backs every asset field in the dashboard - featured images, logos, portraits, and the
 * document pickers - so an asset reads the same wherever it is chosen.
 */
export function SelectedImageCard(props: Readonly<SelectedImageCardProps>): ReactNode {
	const { children, image, onMetadataChange } = props;

	const t = useExtracted();

	const hasCaption = image.caption != null && toPlainText(image.caption) !== "";
	/**
	 * Alt text and captions describe a picture. A document (a PDF policy, say) carries the columns
	 * too, but they are never rendered for it, so showing them here would only invite filling in
	 * something nobody reads.
	 */
	const isImage = image.mimeType == null || image.mimeType.startsWith("image/");

	function handleSaved(saved: SavedAssetMetadata) {
		/**
		 * The dialog can only name a license once its option list has loaded, and it loads that list
		 * lazily - saving before it arrives reports the id without the label. An unchanged id means the
		 * label already on screen still describes it, so keep it rather than blanking the line.
		 */
		const license =
			saved.licenseId === image.licenseId
				? (saved.license ?? image.license ?? null)
				: saved.license;

		onMetadataChange?.({ ...image, ...saved, license });
	}

	return (
		<div className="flex flex-col gap-y-4 rounded-lg border border-border p-3">
			<div className="flex flex-row flex-wrap items-start gap-x-4 gap-y-3">
				<div className="block-24 inline-32 shrink-0 overflow-hidden rounded-md bg-muted">
					<AssetPreview
						alt={image.alt ?? image.label ?? t("Selected image")}
						className="block-full inline-full"
						imageClassName="object-contain"
						kindLabelClassName="bg-background/90 text-xs"
						mimeType={image.mimeType ?? undefined}
						src={image.url}
						storageKey={image.key}
					/>
				</div>

				<div className="flex min-inline-0 flex-1 flex-col gap-y-1.5">
					<span className="truncate font-medium text-sm/tight">{image.label ?? image.key}</span>

					{isImage ? (
						<Fragment>
							<span className="line-clamp-2 text-muted-fg text-xs">
								<span className="font-medium">{t("Alt text")}:</span>{" "}
								{image.alt != null && image.alt !== "" ? image.alt : "—"}
							</span>

							<span className="line-clamp-2 text-muted-fg text-xs">
								<span className="font-medium">{t("Caption")}:</span>{" "}
								{hasCaption ? toPlainText(image.caption) : "—"}
							</span>
						</Fragment>
					) : null}

					<div className="flex flex-row flex-wrap items-center gap-x-1.5 text-muted-fg text-xs">
						{image.license != null ? <span>{image.license.code}</span> : null}
						{image.license != null && image.mimeType != null ? (
							<span aria-hidden={true}>{"·"}</span>
						) : null}
						{image.mimeType != null ? <span>{image.mimeType}</span> : null}
					</div>
				</div>
			</div>

			<div className="flex flex-row flex-wrap items-center gap-2">
				{children}

				{image.id != null && onMetadataChange != null ? (
					<EditAssetMetadataDialog
						asset={{
							id: image.id,
							key: image.key,
							label: image.label ?? image.key,
							alt: image.alt ?? null,
							caption: image.caption ?? null,
							licenseId: image.licenseId ?? null,
							mimeType: image.mimeType ?? "",
							url: image.url,
						}}
						onSuccess={handleSaved}
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
					href={`/api/assets/download?key=${encodeURIComponent(image.key)}`}
				>
					<ArrowDownTrayIcon aria-hidden={true} className="block-4 inline-4" />
					{t("Download original")}
				</a>
			</div>
		</div>
	);
}
