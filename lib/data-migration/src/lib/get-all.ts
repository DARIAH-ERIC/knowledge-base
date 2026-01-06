export async function getAll<T>(url: URL, header = "X-WP-TotalPages"): Promise<Array<T>> {
	const results: Array<T> = [];

	const response = await fetch(url);
	results.push(...((await response.json()) as Array<T>));

	let page = 1;
	const pages = Number(response.headers.get(header) ?? 1);

	while (++page <= pages) {
		url.searchParams.set("page", String(page));
		const response = await fetch(url);
		results.push(...((await response.json()) as Array<T>));
	}

	return results;
}
