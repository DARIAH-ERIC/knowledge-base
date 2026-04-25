"use client";

import { assetPrefixes } from "@dariah-eric/storage/config";
import { SearchField, SearchInput } from "@dariah-eric/ui/search-field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import {
	Header,
	HeaderAction,
	HeaderContent,
	HeaderDescription,
	HeaderTitle,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/header";
import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { useUrlPaginatedSearch } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/use-url-paginated-search";
import { UploadImageDialog } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_components/upload-image-dialog";
import { useRouter } from "@/lib/navigation/navigation";

interface AssetItem {
	id: string;
	key: string;
	label: string;
	url: string;
}

interface AssetsPageProps {
	assets: {
		items: Array<AssetItem>;
		total: number;
	};
	page: number;
	prefix: string;
	q: string;
}

const pageSize = 24;

export function AssetsPage(props: Readonly<AssetsPageProps>): ReactNode {
	const { assets, page: initialPage, prefix: initialPrefix, q: initialQ } = props;

	const t = useExtracted();
	const router = useRouter();
	const { filters, inputValue, isPending, page, setFilter, setInputValue, setPage } =
		useUrlPaginatedSearch({
			filters: { prefix: initialPrefix },
			page: initialPage,
			q: initialQ,
		});
	const selectedPrefix = filters.prefix !== "" ? filters.prefix : "all";
	const totalPages = Math.max(1, Math.ceil(assets.total / pageSize));

	return (
		<Fragment>
			<Header>
				<HeaderContent>
					<HeaderTitle>{t("Assets")}</HeaderTitle>
					<HeaderDescription>{t("Manage all images in the media library.")}</HeaderDescription>
				</HeaderContent>
				<HeaderAction>
					<SearchField onChange={setInputValue} value={inputValue}>
						<SearchInput placeholder={t("Search by label")} />
					</SearchField>

					<Select
						aria-label={t("Filter by prefix")}
						onChange={(key) => {
							const value = String(key);
							setFilter("prefix", value === "all" ? "" : value);
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

			{assets.items.length === 0 ? (
				<div className="flex flex-1 items-center justify-center py-16">
					<p className="text-center text-muted-fg text-sm">
						{inputValue !== "" || selectedPrefix !== "all"
							? t("No images match your filters.")
							: t("No images found. Upload one to get started.")}
					</p>
				</div>
			) : (
				<ul
					className="grid grid-cols-[repeat(auto-fill,minmax(min(12rem,100%),1fr))] gap-4 content-start"
					role="list"
				>
					{assets.items.map((asset) => {
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

			{totalPages > 1 ? (
				<Paginate
					isPending={isPending}
					page={page}
					perPage={pageSize}
					setPage={setPage}
					total={totalPages}
					totalItems={assets.total}
				/>
			) : null}
		</Fragment>
	);
}
