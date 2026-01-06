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

interface WP_Event {
	id: number;
	global_id: string;
	global_id_lineage: Array<string>;
	author: string;
	status: string;
	date: Date;
	date_utc: Date;
	modified: Date;
	modified_utc: Date;
	url: string;
	rest_url: string;
	title: string;
	description: string;
	excerpt: string;
	slug: string;
	image: boolean;
	all_day: boolean;
	start_date: Date;
	start_date_details: DateDetails;
	end_date: Date;
	end_date_details: DateDetails;
	utc_start_date: Date;
	utc_start_date_details: DateDetails;
	utc_end_date: Date;
	utc_end_date_details: DateDetails;
	timezone: string;
	timezone_abbr: string;
	cost: string;
	cost_details: CostDetails;
	website: string;
	show_map: boolean;
	show_map_link: boolean;
	hide_from_listings: boolean;
	sticky: boolean;
	featured: boolean;
	categories: Array<Category>;
	tags: Array<unknown>;
	venue: Venue;
	organizer: Array<unknown>;
}

export interface Category {
	name: string;
	slug: string;
	term_group: number;
	term_taxonomy_id: number;
	taxonomy: string;
	description: string;
	parent: number;
	count: number;
	filter: string;
	id: number;
	urls: Urls;
}

export interface Urls {
	self: string;
	collection: string;
}

export interface CostDetails {
	currency_symbol: string;
	currency_position: string;
	values: Array<unknown>;
}

export interface DateDetails {
	year: string;
	month: string;
	day: string;
	hour: string;
	minutes: string;
	seconds: string;
}

export interface Venue {
	id: number;
	author: string;
	status: string;
	date: Date;
	date_utc: Date;
	modified: Date;
	modified_utc: Date;
	url: string;
	venue: string;
	slug: string;
	country: string;
	show_map: boolean;
	show_map_link: boolean;
	global_id: string;
	global_id_lineage: Array<string>;
}

export interface WordPressData {
	categories: Record<WP_REST_API_Category["id"], WP_REST_API_Category>;
	events: Record<WP_Event["id"], WP_Event>;
	pages: Record<WP_REST_API_Page["id"], WP_REST_API_Page>;
	posts: Record<WP_REST_API_Post["id"], WP_REST_API_Post>;
	media: Record<WP_REST_API_Attachment["id"], WP_REST_API_Attachment>;
	tags: Record<WP_REST_API_Tag["id"], WP_REST_API_Tag>;
}

export async function getWordPressData(apiBaseUrl: string): Promise<WordPressData> {
	const [categories, events, pages, posts, media, tags] = await Promise.all([
		getCategories(apiBaseUrl),
		getEvents(apiBaseUrl),
		getPages(apiBaseUrl),
		getPosts(apiBaseUrl),
		getMedia(apiBaseUrl),
		getTags(apiBaseUrl),
	]);

	const data: WordPressData = {
		categories: keyById(categories),
		events: keyById(events),
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

function getEvents(baseUrl: string): Promise<Array<WP_Event>> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/tribe/events/v1/events",
		searchParams: createUrlSearchParams({ per_page: 100, start_date: "2000-01-01" }),
	});

	return getAll(url, "x-tec-totalpages");
}

function getMedia(baseUrl: string): Promise<WP_REST_API_Attachments> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/media",
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

function getTags(baseUrl: string): Promise<WP_REST_API_Tags> {
	const url = createUrl({
		baseUrl,
		pathname: "/wp-json/wp/v2/tags",
		searchParams: createUrlSearchParams({ per_page: 100 }),
	});

	return getAll(url);
}
