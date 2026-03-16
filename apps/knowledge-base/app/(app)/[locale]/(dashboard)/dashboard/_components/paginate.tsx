"use client";

import {
	Pagination,
	PaginationFirst,
	PaginationGap,
	PaginationInfo,
	PaginationItem,
	PaginationLabel,
	PaginationLast,
	PaginationList,
	PaginationNext,
	PaginationPrevious,
	PaginationSection,
	PaginationSpacer,
} from "@dariah-eric/ui/pagination";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

function getPaginationRange(current: number, total: number, delta = 2) {
	const range: Array<number> = [];
	const left = Math.max(2, current - delta);
	const right = Math.min(total - 1, current + delta);
	range.push(1);
	if (left > 2) range.push(-1);
	for (let i = left; i <= right; i++) range.push(i);
	if (right < total - 1) range.push(-2);
	if (total > 1) range.push(total);
	return range;
}

interface PaginateProps {
	page: number;
	total: number;
	setPage: (page: number) => void;
	perPage?: number;
}

export function Paginate({
	page,
	total,
	setPage,
	perPage = 10,
}: Readonly<PaginateProps>): ReactNode {
	const t = useExtracted();

	const pages = getPaginationRange(page, total);
	const start = (page - 1) * perPage + 1;
	const end = Math.min(page * perPage, total * perPage);
	const totalResults = total * perPage;

	return (
		<Pagination className="flex-col md:flex-row">
			<PaginationInfo>
				{t.rich(
					"Showing <strong>{start, number}</strong> to <strong>{end, number}</strong> of <strong>{total, number}</strong> results",
					{
						start,
						end,
						total: totalResults,
						strong(chunks) {
							return <strong>{chunks}</strong>;
						},
					},
				)}
			</PaginationInfo>
			<PaginationSpacer />
			<PaginationList className="hidden md:flex">
				<PaginationFirst
					isDisabled={page === 1}
					onPress={() => {
						setPage(1);
					}}
				/>
				<PaginationPrevious
					isDisabled={page === 1}
					onPress={() => {
						setPage(page - 1);
					}}
				/>
				<PaginationSection className="**:data-[slot=pagination-item]:min-w-8">
					{pages.map((n) => {
						return n < 0 ? (
							<PaginationGap key={`gap-${String(n)}`} />
						) : (
							<PaginationItem
								key={n}
								isCurrent={n === page}
								onPress={() => {
									setPage(n);
								}}
							>
								{n}
							</PaginationItem>
						);
					})}
				</PaginationSection>
				<PaginationNext
					isDisabled={page === total}
					onPress={() => {
						setPage(page + 1);
					}}
				/>
				<PaginationLast
					isDisabled={page === total}
					onPress={() => {
						setPage(total);
					}}
				/>
			</PaginationList>

			<PaginationList className="md:hidden">
				<PaginationFirst
					isDisabled={page === 1}
					onPress={() => {
						setPage(1);
					}}
				/>
				<PaginationPrevious
					isDisabled={page === 1}
					onPress={() => {
						setPage(page - 1);
					}}
				/>
				<PaginationSection className="rounded-(--section-radius) border px-3 *:min-w-4">
					<PaginationLabel>{page}</PaginationLabel>
					<PaginationLabel className="text-muted-fg">/</PaginationLabel>
					<PaginationLabel>{total}</PaginationLabel>
				</PaginationSection>
				<PaginationNext
					isDisabled={page === total}
					onPress={() => {
						setPage(page + 1);
					}}
				/>
				<PaginationLast
					isDisabled={page === total}
					onPress={() => {
						setPage(total);
					}}
				/>
			</PaginationList>
		</Pagination>
	);
}
