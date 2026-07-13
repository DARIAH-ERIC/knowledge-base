"use client";

import { Button } from "@dariah-eric/ui/button";
import { Checkbox } from "@dariah-eric/ui/checkbox";
import { Link } from "@dariah-eric/ui/link";
import { ModalClose, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import {
	Table,
	TableBody,
	TableCell,
	TableColumn,
	TableHeader,
	TableRow,
} from "@dariah-eric/ui/table";
import { AlertTriangleIcon } from "lucide-react";
import { useExtracted } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";

import { Paginate } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/paginate";
import { deleteUnusedSocialMediaAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/delete-unused-social-media.action";
import { useClientPagination } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/use-client-pagination";
import type {
	DeleteUnusedSocialMediaResult,
	UnusedSocialMedia,
} from "@/lib/data/social-media-cleanup";
import { useRouter } from "@/lib/navigation/navigation";

interface UnusedSocialMediaCleanupProps {
	items: Array<UnusedSocialMedia>;
}

function humanizeType(value: string): string {
	return value.replaceAll("_", " ");
}

export function UnusedSocialMediaCleanup(
	props: Readonly<UnusedSocialMediaCleanupProps>,
): ReactNode {
	const { items } = props;

	const t = useExtracted();
	const router = useRouter();

	const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<DeleteUnusedSocialMediaResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const allSelected = items.length > 0 && selected.size === items.length;

	const { page, pageItems, perPage, setPage, totalItems, totalPages } = useClientPagination(items);

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
		setSelected(isSelected ? new Set(items.map((item) => item.id)) : new Set());
	}

	function confirmDelete() {
		const ids = Array.from(selected);
		setError(null);

		startTransition(async () => {
			try {
				const deleteResult = await deleteUnusedSocialMediaAction(ids);
				setResult(deleteResult);
				setSelected(new Set());
				setIsConfirmOpen(false);
				router.refresh();
			} catch {
				setError(t("Could not delete the selected social-media entries. Please try again."));
			}
		});
	}

	if (items.length === 0) {
		return (
			<div className="my-8 text-balance text-muted-fg text-sm">
				{result != null && result.deletedCount > 0
					? t("Deleted {count} unused social-media entries.", {
							count: String(result.deletedCount),
						})
					: t("No unused social-media entries found.")}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-y-(--layout-padding)">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Checkbox isSelected={allSelected} onChange={toggleAll}>
					{t("{count} unused social-media entries", { count: String(items.length) })}
				</Checkbox>

				<Button
					intent="danger"
					isDisabled={selected.size === 0 || isPending}
					onPress={() => {
						setIsConfirmOpen(true);
					}}
				>
					{selected.size > 0
						? t("Delete selected ({count})", { count: String(selected.size) })
						: t("Delete selected")}
				</Button>
			</div>

			{result != null && result.skippedIds.length > 0 ? (
				<p
					className="flex items-center gap-x-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-subtle-fg"
					role="alert"
				>
					<AlertTriangleIcon aria-hidden={true} className="block-4 inline-4 shrink-0" />
					{t("{skipped} entries were skipped (no longer unused).", {
						skipped: String(result.skippedIds.length),
					})}
				</p>
			) : null}

			<Table
				aria-label={t("Unused social media")}
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn className="inline-px" id="select">
						{t("Select")}
					</TableColumn>
					<TableColumn className="max-inline-80" id="name" isRowHeader={true}>
						{t("Name")}
					</TableColumn>
					<TableColumn id="type">{t("Type")}</TableColumn>
					<TableColumn id="url">{t("URL")}</TableColumn>
				</TableHeader>
				<TableBody items={pageItems}>
					{(item) => (
						<TableRow id={item.id}>
							<TableCell>
								<Checkbox
									aria-label={t("Select this entry")}
									isSelected={selected.has(item.id)}
									onChange={(value) => {
										toggle(item.id, value);
									}}
								/>
							</TableCell>
							<TableCell>
								<div className="max-inline-80 truncate" title={item.name}>
									{item.name}
								</div>
							</TableCell>
							<TableCell>{humanizeType(item.type)}</TableCell>
							<TableCell>
								<Link className="underline" href={item.url} target="_blank">
									{item.url}
								</Link>
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

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
					title={t("Delete {count} unused social-media entries", { count: String(selected.size) })}
					description={t(
						"This permanently removes {count} social-media entries from the database. This action cannot be undone.",
						{ count: String(selected.size) },
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
