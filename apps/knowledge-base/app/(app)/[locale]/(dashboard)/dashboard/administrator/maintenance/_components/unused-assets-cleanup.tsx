"use client";

import { Button } from "@dariah-eric/ui/button";
import { Checkbox } from "@dariah-eric/ui/checkbox";
import { ModalClose, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import { AlertTriangleIcon, DownloadIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";

import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { deleteUnusedAssetsAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/delete-unused-assets.action";
import { useClientPagination } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/use-client-pagination";
import type { DeleteUnusedAssetsResult, UnusedAssetPreview } from "@/lib/data/asset-cleanup";
import { formatFileSize } from "@/lib/format-file-size";
import { useRouter } from "@/lib/navigation/navigation";

interface UnusedAssetsCleanupProps {
	assets: Array<UnusedAssetPreview>;
	totalSize: number;
}

export function UnusedAssetsCleanup(props: Readonly<UnusedAssetsCleanupProps>): ReactNode {
	const { assets, totalSize } = props;

	const t = useExtracted();
	const router = useRouter();

	const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<DeleteUnusedAssetsResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const selectedSize = assets.reduce(
		(sum, asset) => (selected.has(asset.id) ? sum + (asset.size ?? 0) : sum),
		0,
	);

	const allSelected = assets.length > 0 && selected.size === assets.length;

	const { page, pageItems, perPage, setPage, totalItems, totalPages } = useClientPagination(assets);

	function toggle(id: string, isSelected: boolean) {
		setSelected((current) => {
			const next = new Set(current);
			if (isSelected) {
				next.add(id);
			} else {
				next.delete(id);
			}
			return next;
		});
	}

	function toggleAll(isSelected: boolean) {
		setSelected(isSelected ? new Set(assets.map((asset) => asset.id)) : new Set());
	}

	function confirmDelete() {
		const ids = Array.from(selected);
		setError(null);

		startTransition(async () => {
			try {
				const deleteResult = await deleteUnusedAssetsAction(ids);
				setResult(deleteResult);
				setSelected(new Set());
				setIsConfirmOpen(false);
				router.refresh();
			} catch {
				setError(t("Could not delete the selected assets. Please try again."));
			}
		});
	}

	if (assets.length === 0) {
		return (
			<div className="my-8 text-balance text-muted-fg text-sm">
				{result != null && result.deletedCount > 0
					? t("Deleted {count} unused assets, reclaiming {size}.", {
							count: String(result.deletedCount),
							size: formatFileSize(result.reclaimedSize),
						})
					: t("No unused assets found.")}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-y-(--layout-padding)">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Checkbox isSelected={allSelected} onChange={toggleAll}>
					{t("{count} unused assets · {size} reclaimable", {
						count: String(assets.length),
						size: formatFileSize(totalSize),
					})}
				</Checkbox>

				<Button
					intent="danger"
					isDisabled={selected.size === 0 || isPending}
					onPress={() => {
						setIsConfirmOpen(true);
					}}
				>
					{selected.size > 0
						? t("Delete selected ({count}) · {size}", {
								count: String(selected.size),
								size: formatFileSize(selectedSize),
							})
						: t("Delete selected")}
				</Button>
			</div>

			{result != null && (result.skippedIds.length > 0 || result.failedIds.length > 0) ? (
				<p
					className="flex items-center gap-x-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-subtle-fg"
					role="alert"
				>
					<AlertTriangleIcon aria-hidden={true} className="block-4 inline-4 shrink-0" />
					{t(
						"{skipped} assets were skipped (no longer unused) and {failed} could not be removed from storage.",
						{
							skipped: String(result.skippedIds.length),
							failed: String(result.failedIds.length),
						},
					)}
				</p>
			) : null}

			<ul className="grid grid-cols-4 gap-(--layout-padding) sm:grid-cols-6 lg:grid-cols-8">
				{pageItems.map((asset) => {
					const isSelected = selected.has(asset.id);

					return (
						<li
							className="flex flex-col gap-y-2 rounded-md border border-border p-2 selected:border-danger selected:bg-danger/5"
							data-selected={isSelected || undefined}
							key={asset.id}
						>
							<button
								aria-label={t("Select {label}", { label: asset.label })}
								className="block overflow-hidden rounded-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
								onClick={() => {
									toggle(asset.id, !isSelected);
								}}
								type="button"
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									alt={asset.label}
									className="aspect-square inline-full bg-muted object-contain"
									src={asset.url}
								/>
							</button>
							<Checkbox
								className="items-start"
								isSelected={isSelected}
								onChange={(value) => {
									toggle(asset.id, value);
								}}
							>
								<span className="flex flex-col" data-slot="label">
									<span className="line-clamp-2 wrap-break-word text-sm">{asset.label}</span>
									<span className="text-muted-fg text-xs">
										{asset.size != null ? formatFileSize(asset.size) : t("unknown size")}
									</span>
								</span>
							</Checkbox>
							<a
								className="inline-flex items-center gap-x-1 text-muted-fg text-xs underline hover:text-fg"
								download={true}
								href={`/api/assets/${asset.id}/download`}
							>
								<DownloadIcon aria-hidden={true} className="block-3.5 inline-3.5" />
								{t("Download")}
							</a>
						</li>
					);
				})}
			</ul>

			{totalItems > perPage ? (
				<Paginate
					page={page}
					perPage={perPage}
					setPage={setPage}
					total={totalPages}
					totalItems={totalItems}
				/>
			) : null}

			<ModalContent
				isOpen={isConfirmOpen}
				onOpenChange={(open) => {
					if (!open && !isPending) {
						setIsConfirmOpen(false);
					}
				}}
			>
				<ModalHeader
					title={t("Delete {count} unused assets", { count: String(selected.size) })}
					description={t(
						"This permanently removes {count} assets ({size}) from storage and the database. This action cannot be undone.",
						{ count: String(selected.size), size: formatFileSize(selectedSize) },
					)}
				/>
				{error != null ? (
					<div className="px-6 pbe-2">
						<p
							className="flex items-center gap-x-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-danger text-sm"
							role="alert"
						>
							<AlertTriangleIcon aria-hidden={true} className="block-4 inline-4 shrink-0" />
							{error}
						</p>
					</div>
				) : null}
				<ModalFooter>
					<ModalClose isDisabled={isPending}>{t("Cancel")}</ModalClose>
					<Button intent="danger" isPending={isPending} onPress={confirmDelete}>
						{t("Delete")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</div>
	);
}
