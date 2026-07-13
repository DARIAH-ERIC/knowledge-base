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
import { cleanRichTextAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/clean-richtext.action";
import { useClientPagination } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_lib/use-client-pagination";
import type { CleanRichTextResult, RichTextCleanupBlock } from "@/lib/data/richtext-cleanup";
import { getEntityDetailHref } from "@/lib/entity-detail-href";
import { useRouter } from "@/lib/navigation/navigation";

interface RichTextCleanupProps {
	blocks: Array<RichTextCleanupBlock>;
}

function humanizeType(value: string): string {
	return value.replaceAll("_", " ");
}

export function RichTextCleanup(props: Readonly<RichTextCleanupProps>): ReactNode {
	const { blocks } = props;

	const t = useExtracted();
	const router = useRouter();

	const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<CleanRichTextResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const allSelected = blocks.length > 0 && selected.size === blocks.length;

	const rows = blocks.map((block) => {
		return { ...block, id: block.contentBlockId };
	});

	const { page, pageItems, perPage, setPage, totalItems, totalPages } = useClientPagination(rows);

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
		setSelected(isSelected ? new Set(blocks.map((block) => block.contentBlockId)) : new Set());
	}

	function confirmClean() {
		const ids = Array.from(selected);
		setError(null);

		startTransition(async () => {
			try {
				const cleanResult = await cleanRichTextAction(ids);
				setResult(cleanResult);
				setSelected(new Set());
				setIsConfirmOpen(false);
				router.refresh();
			} catch {
				setError(t("Could not normalise the selected content blocks. Please try again."));
			}
		});
	}

	if (blocks.length === 0) {
		return (
			<div className="my-8 text-balance text-muted-fg text-sm">
				{result != null && result.cleanedCount > 0
					? t("Normalised {count} content blocks.", { count: String(result.cleanedCount) })
					: t("No rich-text content needs normalising.")}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-y-(--layout-padding)">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<Checkbox isSelected={allSelected} onChange={toggleAll}>
					{t("{count} content blocks to normalise", { count: String(blocks.length) })}
				</Checkbox>

				<Button
					intent="warning"
					isDisabled={selected.size === 0 || isPending}
					onPress={() => {
						setIsConfirmOpen(true);
					}}
				>
					{selected.size > 0
						? t("Normalise selected ({count})", { count: String(selected.size) })
						: t("Normalise selected")}
				</Button>
			</div>

			{result != null && result.skippedIds.length > 0 ? (
				<p
					className="flex items-center gap-x-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning-subtle-fg"
					role="alert"
				>
					<AlertTriangleIcon aria-hidden={true} className="block-4 inline-4 shrink-0" />
					{t("{skipped} blocks were skipped (no longer changed).", {
						skipped: String(result.skippedIds.length),
					})}
				</p>
			) : null}

			<Table
				aria-label={t("Rich-text to normalise")}
				className="[--gutter:var(--layout-padding)] sm:[--gutter:var(--layout-padding)]"
			>
				<TableHeader>
					<TableColumn className="inline-px" id="select">
						{t("Select")}
					</TableColumn>
					<TableColumn id="entity" isRowHeader={true}>
						{t("Entity")}
					</TableColumn>
					<TableColumn id="type">{t("Type")}</TableColumn>
					<TableColumn id="field">{t("Field")}</TableColumn>
					<TableColumn id="block">{t("Block")}</TableColumn>
					<TableColumn id="status">{t("Status")}</TableColumn>
				</TableHeader>
				<TableBody dependencies={[selected]} items={pageItems}>
					{(block) => {
						const href = getEntityDetailHref({
							entityType: block.entityType,
							slug: block.entitySlug,
						});
						const label = block.entityLabel ?? block.entitySlug;

						return (
							<TableRow id={block.id}>
								<TableCell>
									<Checkbox
										aria-label={t("Select this block")}
										isSelected={selected.has(block.contentBlockId)}
										onChange={(value) => {
											toggle(block.contentBlockId, value);
										}}
									/>
								</TableCell>
								<TableCell>
									{href != null ? (
										<Link className="underline" href={href}>
											{label}
										</Link>
									) : (
										label
									)}
								</TableCell>
								<TableCell>{humanizeType(block.entityType)}</TableCell>
								<TableCell>{humanizeType(block.fieldName)}</TableCell>
								<TableCell>{humanizeType(block.blockType)}</TableCell>
								<TableCell>{humanizeType(block.status)}</TableCell>
							</TableRow>
						);
					}}
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
					title={t("Normalise {count} content blocks", { count: String(selected.size) })}
					description={t(
						"This rewrites the rich text of {count} content blocks to remove empty paragraphs, stray line breaks, non-breaking spaces, imported HTML attributes, and bold headings. This action cannot be undone.",
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
					<Button intent="warning" isPending={isPending} onPress={confirmClean}>
						{t("Normalise")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</div>
	);
}
