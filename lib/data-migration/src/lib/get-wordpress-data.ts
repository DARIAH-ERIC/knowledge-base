import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";
import type {
	WP_REST_API_Attachment,
	WP_REST_API_Attachments,
	WP_REST_API_Categories,
	WP_REST_API_Category,
	WP_REST_API_Page,
	WP_REST_API_Pages,
	WP_REST_API_Post,
	WP_REST_API_Posts,
	WP_REST_API_Tag,
	WP_REST_API_Tags,
} from "wp-types";

import { getAll } from "./get-all";
import { keyById } from "./key-by-id";

export interface WordPressData {
	categories: Record<WP_REST_API_Category["id"], WP_REST_API_Category>;
	pages: Record<WP_REST_API_Page["id"], WP_REST_API_Page>;
	posts: Record<WP_REST_API_Post["id"], WP_REST_API_Post>;
	media: Record<WP_REST_API_Attachment["id"], WP_REST_API_Attachment>;
	tags: Record<WP_REST_API_Category["id"], WP_REST_API_Tag>;
}

export async function getWordPressData(apiBaseUrl: string): Promise<WordPressData> {
	const [categories, pages, posts, media, tags] = await Promise.all([
		getCategories(apiBaseUrl),
		getPages(apiBaseUrl),
		getPosts(apiBaseUrl),
		getMedia(apiBaseUrl),
		getTags(apiBaseUrl),
	]);

	const data: WordPressData = {
		categories: keyById(categories),
		pages: keyById(pages),
		posts: keyById(posts),
		media: keyById(media),
		tags: keyById(tags),
	};

	return data;
}

function getCategories(baseUrl: string): Promise<WP_REST_API_Categories> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/categories",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	return getAll(url);
}

function getTags(baseUrl: string): Promise<WP_REST_API_Tags> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/tags",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	return getAll(url);
}

function getPages(baseUrl: string): Promise<WP_REST_API_Pages> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/pages",
		searchParams: createUrlSearchParams({ per_page: 100, _embed: "author" }),
	});

	return getAll(url);
}

function getPosts(baseUrl: string): Promise<WP_REST_API_Posts> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/posts",
		searchParams: createUrlSearchParams({ per_page: 100, _embed: "author" }),
	});

	return getAll(url);
}

function getMedia(baseUrl: string): Promise<WP_REST_API_Attachments> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/media",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	return getAll(url);
}
