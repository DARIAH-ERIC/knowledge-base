"use client";

import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { GridList, GridListItem } from "@dariah-eric/ui/grid-list";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import cn from "clsx/lite";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useEffect, useState } from "react";

import { uploadImageForEditorAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image-for-editor.action";

interface ImageAsset {
	id: string;
	key: string;
	label: string;
	url: string;
}

interface RichTextImagePickerProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (image: { src: string; assetKey: string; assetId: string }) => void;
}

export function RichTextImagePicker(props: Readonly<RichTextImagePickerProps>): ReactNode {
	const { isOpen, onOpenChange, onSelect } = props;

	const t = useExtracted();

	return (
		<ModalContent isOpen={isOpen} onOpenChange={onOpenChange} size="3xl">
			<ModalHeader
				description={t("Upload a new image or select one from the media library.")}
				title={t("Insert image")}
			/>
			<Tabs>
				<TabList aria-label={t("Image source")}>
					<Tab id="upload">{t("Upload")}</Tab>
					<Tab id="library">{t("Library")}</Tab>
				</TabList>
				<TabPanel id="upload">
					<UploadTab onSelect={onSelect} onOpenChange={onOpenChange} />
				</TabPanel>
				<TabPanel id="library">
					<LibraryTab isOpen={isOpen} onSelect={onSelect} onOpenChange={onOpenChange} />
				</TabPanel>
			</Tabs>
		</ModalContent>
	);
}

interface UploadTabProps {
	onSelect: (image: { src: string; assetKey: string; assetId: string }) => void;
	onOpenChange: (open: boolean) => void;
}

function UploadTab({ onSelect, onOpenChange }: Readonly<UploadTabProps>): ReactNode {
	const t = useExtracted();
	const [filePreview, setFilePreview] = useState<string | null>(null);

	const [state, formAction, isPending] = useActionState(
		async (
			prevState: ActionState<{ src: string; assetKey: string; assetId: string }>,
			formData: FormData,
		) => {
			const result = await uploadImageForEditorAction(prevState, formData);
			if (result.status === "success") {
				onSelect(result.data);
				onOpenChange(false);
				setFilePreview(null);
			}
			return result;
		},
		createActionStateInitial(),
	);

	return (
		<Form action={formAction} state={state}>
			<ModalBody className="flex flex-col gap-y-4">
				<FormStatus state={state} />
				<div className="flex flex-col gap-y-2">
					<label className="text-sm font-medium">
						{t("File")}
						<span aria-hidden={true} className="ml-0.5 text-danger">
							{"*"}
						</span>
					</label>
					<input
						accept="image/jpeg, image/png"
						className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-fg focus:outline-none hover:file:bg-secondary/80"
						name="file"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file != null) {
								if (filePreview != null) {
									URL.revokeObjectURL(filePreview);
								}
								setFilePreview(URL.createObjectURL(file));
							}
						}}
						required={true}
						type="file"
					/>
					{filePreview != null && (
						<img
							alt={t("Preview")}
							className="mt-1 size-24 rounded-lg object-cover"
							src={filePreview}
						/>
					)}
				</div>
			</ModalBody>
			<ModalFooter>
				<ModalClose>{t("Cancel")}</ModalClose>
				<Button isPending={isPending} type="submit">
					{isPending ? (
						<Fragment>
							<ProgressCircle aria-label={t("Uploading...")} isIndeterminate={true} />
							<span aria-hidden={true}>{t("Uploading...")}</span>
						</Fragment>
					) : (
						t("Upload")
					)}
				</Button>
			</ModalFooter>
		</Form>
	);
}

interface LibraryTabProps {
	isOpen: boolean;
	onSelect: (image: { src: string; assetKey: string; assetId: string }) => void;
	onOpenChange: (open: boolean) => void;
}

function LibraryTab({ isOpen, onSelect, onOpenChange }: Readonly<LibraryTabProps>): ReactNode {
	const t = useExtracted();
	const [assets, setAssets] = useState<Array<ImageAsset>>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [selectedKey, setSelectedKey] = useState<string | null>(null);

	useEffect(() => {
		if (!isOpen) return;

		setIsLoading(true);
		fetch("/api/assets?limit=50")
			.then((res) => {
				return res.json() as Promise<{ items: Array<ImageAsset>; total: number }>;
			})
			.then(({ items }) => {
				setAssets(items);
			})
			.catch(() => {
				setAssets([]);
			})
			.finally(() => {
				setIsLoading(false);
			});
	}, [isOpen]);

	function handleConfirm() {
		if (selectedKey == null) return;
		const asset = assets.find((a) => {
			return a.key === selectedKey;
		});
		if (asset == null) return;
		onSelect({ src: asset.url, assetKey: asset.key, assetId: asset.id });
		onOpenChange(false);
	}

	return (
		<>
			<ModalBody className="h-96">
				{isLoading ? (
					<div className="flex h-full items-center justify-center">
						<ProgressCircle isIndeterminate={true} />
					</div>
				) : assets.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-center text-muted-fg text-sm">
							{t("No images found. Upload one to get started.")}
						</p>
					</div>
				) : (
					<GridList
						aria-label={t("Media library")}
						className={cn("grid grid-cols-[repeat(auto-fill,minmax(min(8rem,100%),1fr))] gap-3")}
						items={assets}
						layout="grid"
						onSelectionChange={(keys) => {
							if (keys !== "all" && keys.size > 0) {
								setSelectedKey(String([...keys][0]));
							} else {
								setSelectedKey(null);
							}
						}}
						selectedKeys={selectedKey != null ? new Set([selectedKey]) : new Set()}
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
				)}
			</ModalBody>
			<ModalFooter>
				<ModalClose>{t("Cancel")}</ModalClose>
				<Button isDisabled={selectedKey == null} onPress={handleConfirm}>
					{t("Select")}
				</Button>
			</ModalFooter>
		</>
	);
}
