type RawSearchParams = Record<string, string | Array<string> | undefined>;

export interface ListSearchParams {
	page: number;
	q: string;
}

function getSearchParam(
	searchParams: Readonly<RawSearchParams> | undefined,
	key: string,
): string | undefined {
	const value = searchParams?.[key];

	if (Array.isArray(value)) {
		return value[0];
	}

	return value;
}

export function getListSearchParams(
	searchParams: Readonly<RawSearchParams> | undefined,
): ListSearchParams {
	const rawPage = getSearchParam(searchParams, "page");
	const rawQ = getSearchParam(searchParams, "q") ?? "";
	const parsedPage = Number.parseInt(rawPage ?? "1", 10);

	return {
		page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
		q: rawQ.trim(),
	};
}
