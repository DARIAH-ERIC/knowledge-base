import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import {
	events,
	impactCaseStudies,
	news,
	pages,
	spotlightArticles,
} from "@dariah-eric/dariah-knowledge-base-database-client/schema";

interface QueryProps {
	page: number;
	pageSize: number;
}

export async function getEvents(props: QueryProps) {
	const { pageSize, page } = props;

	const {
		id,
		title,
		slug,
		imageId,
		location,
		summary,
		startDate,
		startTime,
		endDate,
		endTime,
		website,
	} = events;

	const data = await db
		.select({
			id,
			title,
			imageId,
			location,
			slug,
			summary,
			startDate,
			startTime,
			endDate,
			endTime,
			website,
		})
		.from(events)
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	return data;
}

export async function getImpactCaseStudies(props: QueryProps) {
	const { pageSize, page } = props;

	const { id, title, slug, imageId, summary } = impactCaseStudies;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(impactCaseStudies)
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	return data;
}

export async function getNews(props: QueryProps) {
	const { pageSize, page } = props;

	const { id, title, slug, imageId, summary } = news;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(news)
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	return data;
}

export async function getPages(props: QueryProps) {
	const { pageSize, page } = props;

	const { id, title, slug, imageId, summary } = pages;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(pages)
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	return data;
}

export async function getSpotLightArticles(props: QueryProps) {
	const { pageSize, page } = props;

	const { id, title, slug, imageId, summary } = spotlightArticles;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(spotlightArticles)
		.limit(pageSize)
		.offset((page - 1) * pageSize);
	return data;
}
