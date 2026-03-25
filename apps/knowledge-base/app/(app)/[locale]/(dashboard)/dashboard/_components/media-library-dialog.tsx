"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import type { AssetPrefix } from "@dariah-eric/storage";
import { Button } from "@dariah-eric/ui/button";
import { GridList, GridListItem } from "@dariah-eric/ui/grid-list";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import cn from "clsx/lite";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useState, useTransition } from "react";
import { FileTrigger, type Selection } from "react-aria-components";

import { uploadImageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.action";

interface MediaLibraryDialogProps {
	assets: Array<{ key: string; label: string; url: string }>;
	onSelect: (key: string, url: string) => void;
	prefix?: AssetPrefix;
}

export function MediaLibraryDialog(props: Readonly<MediaLibraryDialogProps>): ReactNode {
	const { assets, onSelect, prefix = "images" } = props;

	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);
	const [selectedKeys, setSelectedKeys] = useState<Selection>(() => {
		return new Set();
	});
	const [isUploading, startUploading] = useTransition();

	function handleFileSelect(files: FileList | null) {
		const file = files?.[0];
		if (file == null) return;

		const formData = new FormData();
		formData.append("file", file);
		formData.append("prefix", prefix);

		startUploading(async () => {
			const result = await uploadImageAction(createActionStateInitial(), formData);

			if (result.status === "success") {
				setSelectedKeys(new Set([result.data.key]));
			}
		});
	}

	function handleConfirm() {
		if (selectedKeys === "all" || selectedKeys.size === 0) return;

		const key = [...selectedKeys][0] as string;
		const url =
			assets.find((a) => {
				return a.key === key;
			})?.url ?? "";

		onSelect(key, url);
		setIsOpen(false);
	}

	const hasSelection = selectedKeys !== "all" && selectedKeys.size > 0;

	return (
		<Fragment>
			<Button
				intent="outline"
				onPress={() => {
					setIsOpen(true);
				}}
			>
				{t("Select image")}
			</Button>

			<ModalContent isOpen={isOpen} onOpenChange={setIsOpen} size="3xl">
				<ModalHeader
					description={t("Select an existing image or upload a new one.")}
					title={t("Media library")}
				/>

				<ModalBody className="h-96">
					{assets.length === 0 ? (
						<div className="flex h-full items-center justify-center">
							<p className="text-center text-muted-fg text-sm">
								{t("No images found. Upload one to get started.")}
							</p>
						</div>
					) : (
						<div className="relative">
							<GridList
								aria-label={t("Media library")}
								className={cn(
									"grid grid-cols-[repeat(auto-fill,minmax(min(8rem,100%),1fr))] gap-3",
									isUploading && "opacity-50",
								)}
								items={assets}
								layout="grid"
								onSelectionChange={setSelectedKeys}
								selectedKeys={selectedKeys}
								selectionBehavior="replace"
								selectionMode="single"
							>
								{(asset) => {
									return (
										<GridListItem
											className="p-1 place-content-center flex flex-col gap-1"
											id={asset.key}
											textValue={asset.label}
										>
											<img
												alt={asset.label}
												className="size-24 rounded-sm object-cover"
												src={asset.url}
											/>
											<span className="w-24 truncate text-center text-xs text-muted-fg">
												{asset.label}
											</span>
										</GridListItem>
									);
								}}
							</GridList>

							{isUploading ? (
								<div className="absolute inset-0 flex items-center justify-center">
									<ProgressCircle isIndeterminate={true} />
								</div>
							) : null}
						</div>
					)}
				</ModalBody>

				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>

					<FileTrigger acceptedFileTypes={["image/jpeg", "image/png"]} onSelect={handleFileSelect}>
						<Button intent="secondary" isPending={isUploading}>
							{isUploading ? (
								<Fragment>
									<ProgressCircle isIndeterminate={true} />
									{t("Uploading...")}
								</Fragment>
							) : (
								t("Upload image")
							)}
						</Button>
					</FileTrigger>

					<Button isDisabled={!hasSelection} onPress={handleConfirm}>
						{t("Select")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}
