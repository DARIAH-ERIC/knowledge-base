"use client";

import { useCallback, useEffect, useOptimistic, useState, useTransition } from "react";

import { usePathname, useRouter, useSearchParams } from "@/lib/navigation/navigation";

interface UseUrlPaginatedSearchParams {
	debounceMs?: number;
	page: number;
	q: string;
}

interface UseUrlPaginatedSearchResult {
	inputValue: string;
	isPending: boolean;
	page: number;
	q: string;
	setInputValue: (value: string) => void;
	setPage: (page: number) => void;
}

export function useUrlPaginatedSearch(
	params: Readonly<UseUrlPaginatedSearchParams>,
): UseUrlPaginatedSearchResult {
	const { debounceMs = 300, page, q } = params;

	const pathname = usePathname();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [optimisticState, setOptimisticState] = useOptimistic(
		{ page, q },
		(_currentState, nextState: { page: number; q: string }) => {
			return nextState;
		},
	);
	const [inputValue, setInputValue] = useState(q);

	const replaceState = useCallback(
		(nextState: Readonly<{ page: number; q: string }>) => {
			const params = new URLSearchParams(searchParams.toString());

			if (nextState.q !== "") {
				params.set("q", nextState.q);
			} else {
				params.delete("q");
			}

			if (nextState.page > 1) {
				params.set("page", String(nextState.page));
			} else {
				params.delete("page");
			}

			const href = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;

			setOptimisticState({ page: nextState.page, q: nextState.q });
			startTransition(() => {
				router.replace(href, { scroll: false });
			});
		},
		[pathname, router, searchParams, setOptimisticState],
	);

	useEffect(() => {
		setInputValue(q);
	}, [q]);

	useEffect(() => {
		const handle = window.setTimeout(() => {
			const nextQ = inputValue.trim();

			if (nextQ === optimisticState.q) {
				return;
			}

			replaceState({ page: 1, q: nextQ });
		}, debounceMs);

		return () => {
			window.clearTimeout(handle);
		};
	}, [debounceMs, inputValue, optimisticState.q, replaceState]);

	const setPage = useCallback(
		(nextPage: number) => {
			replaceState({ page: Math.max(nextPage, 1), q: optimisticState.q });
		},
		[optimisticState.q, replaceState],
	);

	return {
		inputValue,
		isPending,
		page: optimisticState.page,
		q: optimisticState.q,
		setInputValue,
		setPage,
	};
}
