"use client";

import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, use, useState } from "react";
import { useFilter } from "react-aria-components";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { UploadImageDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/upload-image-dialog";
import { assetPrefixes } from "@dariah-eric/storage/config";
import { useRouter } from "@/lib/navigation/navigation";

interface AssetItem {
	id: string;
	key: string;
	label: string;
	url: string;
}

interface AssetsPageProps {
	assets: Promise<{
		items: Array<AssetItem>;
		total: number;
	}>;
}

const pageSize = 24;

export function AssetsPage(props: Readonly<AssetsPageProps>): ReactNode {
	const { assets: assetsPromise } = props;

	const { items } = use(assetsPromise);

	const t = useExtracted();
	const router = useRouter();
	const { contains } = useFilter({ sensitivity: "base" });

	const [searchText, setSearchText] = useState("");
	const [selectedPrefix, setSelectedPrefix] = useState<string>("all");
	const [page, setPage] = useState(1);

	const filteredItems = items.filter((item) => {
		const matchesSearch = searchText === "" || contains(item.label, searchText);
		const itemPrefix = item.key.split("/")[0] ?? "";
		const matchesPrefix = selectedPrefix === "all" || itemPrefix === selectedPrefix;
		return matchesSearch && matchesPrefix;
	});

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
	const currentPage = Math.min(page, totalPages);
	const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Assets")}</HeaderTitle>
					<HeaderDescription>{t("Manage all images in the media library.")}</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField
						onChange={(value) => {
							setSearchText(value);
							setPage(1);
						}}
						value={searchText}
					>
						<SearchInput placeholder={t("Search by label")} />
					</SearchField>

					<Select
						aria-label={t("Filter by prefix")}
						onChange={(key) => {
							setSelectedPrefix(String(key));
							setPage(1);
						}}
						value={selectedPrefix}
					>
						<SelectTrigger />
						<SelectContent>
							<SelectItem id="all">{t("All prefixes")}</SelectItem>
							{assetPrefixes.map((prefix) => {
								return (
									<SelectItem key={prefix} id={prefix}>
										{prefix}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>

					<UploadImageDialog
						onSuccess={() => {
							router.refresh();
						}}
					/>
				</HeaderAction>
			</Header>

			{paginatedItems.length === 0 ? (
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-center text-muted-fg text-sm">
						{searchText !== "" || selectedPrefix !== "all"
							? t("No images match your filters.")
							: t("No images found. Upload one to get started.")}
					</p>
				</div>
			) : (
				<ul
					className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-4 content-start"
					role="list"
				>
					{paginatedItems.map((asset) => {
						const prefix = asset.key.split("/")[0] ?? "";
						return (
							<li key={asset.id}>
								<figure className="flex flex-col gap-y-2">
									<div className="overflow-hidden rounded-lg bg-muted aspect-square">
										<img alt={asset.label} className="size-full object-cover" src={asset.url} />
									</div>
									<figcaption className="flex flex-col gap-y-0.5 px-0.5">
										<span className="truncate text-sm/tight font-medium">{asset.label}</span>
										<span className="text-xs text-muted-fg">{prefix}</span>
									</figcaption>
								</figure>
							</li>
						);
					})}
				</ul>
			)}

			{totalPages > 1 && (
				<Paginate page={currentPage} perPage={pageSize} setPage={setPage} total={totalPages} />
			)}
		</Fragment>
	);
}
