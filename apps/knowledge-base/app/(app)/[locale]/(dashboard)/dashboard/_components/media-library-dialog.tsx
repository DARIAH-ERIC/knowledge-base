"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { type AssetPrefix, assetPrefixes } from "@dariah-eric/storage/config";
import { Button } from "@dariah-eric/ui/button";
import { Label } from "@dariah-eric/ui/field";
import { GridList, GridListItem } from "@dariah-eric/ui/grid-list";
import { Input } from "@dariah-eric/ui/input";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Tab, TabList, TabPanel, Tabs } from "@dariah-eric/ui/tabs";
import { TextField } from "@dariah-eric/ui/text-field";
import cn from "clsx/lite";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useRef, useState, useTransition } from "react";
import { FileTrigger, type Selection } from "react-aria-components";

import { uploadImageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.action";
import { imageMimeTypes, mediaLibraryPageSize } from "@/config/assets.config";

interface Asset {
	key: string;
	label: string;
	url: string;
}

interface MediaLibraryDialogProps {
	acceptedFileTypes?: ReadonlyArray<string>;
	assets: Array<Asset>;
	onSelect: (key: string, url: string) => void;
	prefix?: AssetPrefix;
	prefixes?: ReadonlyArray<AssetPrefix>;
}

type ActiveTab = "select" | "upload";

export function MediaLibraryDialog(props: Readonly<MediaLibraryDialogProps>): ReactNode {
	const {
		acceptedFileTypes = imageMimeTypes,
		assets: initialAssets,
		onSelect,
		prefix = "images",
		prefixes = assetPrefixes,
	} = props;

	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<ActiveTab>("select");

	// Select tab state
	const [selectedKeys, setSelectedKeys] = useState<Selection>(() => {
		return new Set();
	});
	const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
	const [displayedAssets, setDisplayedAssets] = useState<Array<Asset>>(initialAssets);
	const [selectedPrefix, setSelectedPrefix] = useState<AssetPrefix>(prefix);
	const [offset, setOffset] = useState<number>(0);
	const [appliedQ, setAppliedQ] = useState("");
	const [isFetching, startFetching] = useTransition();

	// Upload tab state
	const [pendingFile, setPendingFile] = useState<File | null>(null);
	const [pendingFileUrl, setPendingFileUrl] = useState<string | null>(null);
	const [isUploading, startUploading] = useTransition();

	const searchInputRef = useRef<HTMLInputElement>(null);
	const uploadFormRef = useRef<HTMLFormElement>(null);

	const hasPrev = offset > 0;
	const hasNext = displayedAssets.length === mediaLibraryPageSize;

	async function fetchPage(
		newOffset: number,
		q: string,
		fetchPrefix: AssetPrefix,
	): Promise<Array<Asset>> {
		const params = new URLSearchParams({ prefix: fetchPrefix });
		if (q) {
			params.set("q", q);
		}
		if (newOffset > 0) {
			params.set("offset", String(newOffset));
		}
		const response = await fetch(`/api/assets?${params.toString()}`);
		const data = (await response.json()) as { items: Array<Asset> };
		return data.items;
	}

	function resetUploadTab() {
		if (pendingFileUrl != null) {
			URL.revokeObjectURL(pendingFileUrl);
		}
		setPendingFile(null);
		setPendingFileUrl(null);
		uploadFormRef.current?.reset();
	}

	function handleOpen() {
		setIsOpen(true);
		setActiveTab("select");
		setSelectedPrefix(prefix);
		setOffset(0);
		setAppliedQ("");
		setSelectedKeys(new Set());
		setSelectedAsset(null);
		if (searchInputRef.current) {
			searchInputRef.current.value = "";
		}
		startFetching(async () => {
			const items = await fetchPage(0, "", prefix);
			setDisplayedAssets(items);
		});
	}

	function handleOpenChange(open: boolean) {
		setIsOpen(open);
		if (!open) {
			resetUploadTab();
		}
	}

	function handlePrefixChange(newPrefix: AssetPrefix) {
		setSelectedPrefix(newPrefix);
		setOffset(0);
		setAppliedQ("");
		setSelectedKeys(new Set());
		setSelectedAsset(null);
		if (searchInputRef.current) {
			searchInputRef.current.value = "";
		}
		startFetching(async () => {
			const items = await fetchPage(0, "", newPrefix);
			setDisplayedAssets(items);
		});
	}

	function handleSelectionChange(keys: Selection) {
		setSelectedKeys(keys);
		if (keys !== "all" && keys.size > 0) {
			const key = [...keys][0] as string;
			const asset = displayedAssets.find((a) => {
				return a.key === key;
			});
			if (asset) {
				setSelectedAsset(asset);
			}
		} else {
			setSelectedAsset(null);
		}
	}

	function handleSearch(event: { preventDefault: () => void }) {
		event.preventDefault();
		const q = searchInputRef.current?.value ?? "";
		setAppliedQ(q);
		setSelectedKeys(new Set());
		setSelectedAsset(null);
		startFetching(async () => {
			const items = await fetchPage(0, q, selectedPrefix);
			setDisplayedAssets(items);
			setOffset(0);
		});
	}

	function handlePrev() {
		const newOffset: number = offset - mediaLibraryPageSize;
		setSelectedKeys(new Set());
		setSelectedAsset(null);
		startFetching(async () => {
			const items = await fetchPage(newOffset, appliedQ, selectedPrefix);
			setDisplayedAssets(items);
			setOffset(newOffset);
		});
	}

	function handleNext() {
		const newOffset: number = offset + mediaLibraryPageSize;
		setSelectedKeys(new Set());
		setSelectedAsset(null);
		startFetching(async () => {
			const items = await fetchPage(newOffset, appliedQ, selectedPrefix);
			setDisplayedAssets(items);
			setOffset(newOffset);
		});
	}

	function handleFileChoose(files: FileList | null) {
		const file = files?.[0] ?? null;
		if (pendingFileUrl != null) {
			URL.revokeObjectURL(pendingFileUrl);
		}
		setPendingFile(file);
		setPendingFileUrl(file != null ? URL.createObjectURL(file) : null);
	}

	function handleUploadAction(formData: FormData) {
		if (pendingFile == null) return;
		formData.append("file", pendingFile);
		startUploading(async () => {
			const result = await uploadImageAction(createActionStateInitial(), formData);

			if (result.status === "success") {
				onSelect(result.data.key, result.data.url);
				setIsOpen(false);
			}
		});
	}

	function handleConfirm() {
		if (selectedAsset == null) return;
		onSelect(selectedAsset.key, selectedAsset.url);
		setIsOpen(false);
	}

	const isPending = isUploading || isFetching;

	return (
		<Fragment>
			<Button intent="outline" onPress={handleOpen}>
				{t("Select image")}
			</Button>

			<ModalContent isOpen={isOpen} onOpenChange={handleOpenChange} size="3xl">
				<ModalHeader
					description={t("Select an existing image or upload a new one.")}
					title={t("Media library")}
				/>

				<ModalBody className="flex h-128 flex-col">
					<Tabs
						className="flex flex-1 flex-col min-h-0"
						onSelectionChange={(key) => {
							if (activeTab === "upload" && key !== "upload") {
								resetUploadTab();
							}
							setActiveTab(key as ActiveTab);
						}}
						selectedKey={activeTab}
					>
						<TabList>
							<Tab id="select">{t("Select")}</Tab>
							<Tab id="upload">{t("Upload")}</Tab>
						</TabList>

						<TabPanel className="flex flex-1 flex-col gap-3 min-h-0" id="select">
							<div className="flex gap-2">
								{prefixes.map((p) => {
									return (
										<Button
											key={p}
											intent={selectedPrefix === p ? "primary" : "outline"}
											isDisabled={isPending}
											onPress={() => {
												handlePrefixChange(p);
											}}
										>
											{p}
										</Button>
									);
								})}
							</div>

							<form className="flex gap-2" onSubmit={handleSearch}>
								<input
									ref={searchInputRef}
									className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm outline-none placeholder:text-muted-fg focus:ring-2 focus:ring-ring"
									placeholder={t("Search...")}
									type="search"
								/>
								<Button intent="outline" type="submit">
									{t("Search")}
								</Button>
							</form>

							{displayedAssets.length === 0 && !isPending ? (
								<div className="flex flex-1 items-center justify-center">
									<p className="text-center text-muted-fg text-sm">
										{appliedQ
											? t("No images found for your search.")
											: t("No images found. Upload one to get started.")}
									</p>
								</div>
							) : (
								<div className="relative flex-1 overflow-y-auto">
									<GridList
										aria-label={t("Media library")}
										className={cn(
											"grid grid-cols-[repeat(auto-fill,minmax(min(8rem,100%),1fr))] gap-3",
											isPending && "opacity-50",
										)}
										items={displayedAssets}
										layout="grid"
										onSelectionChange={handleSelectionChange}
										selectedKeys={selectedKeys}
										selectionBehavior="replace"
										selectionMode="single"
									>
										{(asset) => {
											return (
												<GridListItem
													className="flex flex-col gap-1 p-1 place-content-center"
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

									{isPending ? (
										<div className="absolute inset-0 flex items-center justify-center">
											<ProgressCircle isIndeterminate={true} />
										</div>
									) : null}
								</div>
							)}

							<div className="flex items-center justify-between">
								<Button intent="outline" isDisabled={!hasPrev || isPending} onPress={handlePrev}>
									{t("Previous")}
								</Button>
								<Button intent="outline" isDisabled={!hasNext || isPending} onPress={handleNext}>
									{t("Next")}
								</Button>
							</div>
						</TabPanel>

						<TabPanel className="flex flex-1 flex-col gap-4 overflow-y-auto p-1" id="upload">
							<form ref={uploadFormRef} action={handleUploadAction} id="upload-form">
								<input name="prefix" type="hidden" value={selectedPrefix} />

								<div className="flex flex-col gap-4">
									<div className="flex items-start gap-4">
										<FileTrigger
											acceptedFileTypes={acceptedFileTypes as Array<string>}
											onSelect={handleFileChoose}
										>
											<Button intent="outline" type="button">
												{t("Choose file...")}
											</Button>
										</FileTrigger>

										{pendingFileUrl != null ? (
											<img
												alt={t("Preview")}
												className="size-24 rounded-sm object-cover"
												src={pendingFileUrl}
											/>
										) : null}
									</div>

									{pendingFile != null ? (
										<p className="text-muted-fg text-sm">{pendingFile.name}</p>
									) : null}

									<TextField name="label">
										<Label>{t("Label")}</Label>
										<Input placeholder={pendingFile?.name ?? ""} />
									</TextField>

									<TextField name="alt">
										<Label>{t("Alt text")}</Label>
										<Input />
									</TextField>

									<TextField name="caption">
										<Label>{t("Caption")}</Label>
										<Input />
									</TextField>
								</div>
							</form>
						</TabPanel>
					</Tabs>
				</ModalBody>

				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>

					{activeTab === "select" ? (
						<Button isDisabled={selectedAsset == null} onPress={handleConfirm}>
							{t("Select")}
						</Button>
					) : (
						<Button form="upload-form" isPending={isUploading} type="submit">
							{isUploading ? (
								<Fragment>
									<ProgressCircle isIndeterminate={true} />
									{t("Uploading...")}
								</Fragment>
							) : (
								t("Upload")
							)}
						</Button>
					)}
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}
