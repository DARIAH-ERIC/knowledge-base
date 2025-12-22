import { db } from "@dariah-eric/dariah-knowledge-base-database-client/client";
import {
	events,
	news,
	pages,
	spotlightArticles,
} from "@dariah-eric/dariah-knowledge-base-database-client/schema";

import { eq } from "drizzle-orm";

interface QueryProps {
	limit: number;
	offset: number;
}

export async function getEvents(props: QueryProps) {
	const { limit, offset } = props;

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
		.limit(limit)
		.offset(offset);
	return data;
}

interface ParamProps {
	id: string;
}

export async function getEvent(props: ParamProps) {
	const { id: eventId } = props;

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

	const [data] = await db
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
		.where(eq(id, eventId));
	return data;
}

export async function getImpactCaseStudies(props: QueryProps) {
	const { limit, offset } = props;

	const data = await db.query.impactCaseStudies.findMany({
		columns: {
			id: true,
			title: true,
			slug: true,
			imageId: true,
			summary: true,
		},
		with: {
			contributors: {},
		},
		limit,
		offset,
	});

	return data;
}

export async function getImpactCaseStudy(props: ParamProps) {
	const { id: impactCaseStudyId } = props;

	const data = await db.query.impactCaseStudies.findFirst({
		columns: {
			id: true,
			title: true,
			slug: true,
			imageId: true,
			summary: true,
		},
		with: {
			contributors: {},
		},
		where: {
			id: impactCaseStudyId,
		},
	});

	return data;
}

export async function getNews(props: QueryProps) {
	const { limit, offset } = props;

	const { id, title, slug, imageId, summary } = news;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(news)
		.limit(limit)
		.offset(offset);
	return data;
}

export async function getNewsItem(props: ParamProps) {
	const { id: newsItemId } = props;

	const { id, title, slug, imageId, summary } = news;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(news)
		.where(eq(id, newsItemId));
	return data;
}

export async function getPages(props: QueryProps) {
	const { limit, offset } = props;

	const { id, title, slug, imageId, summary } = pages;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(pages)
		.limit(limit)
		.offset(offset);
	return data;
}

export async function getPage(props: ParamProps) {
	const { id: pageId } = props;

	const { id, title, slug, imageId, summary } = news;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(news)
		.where(eq(id, pageId));
	return data;
}

export async function getSpotLightArticles(props: QueryProps) {
	const { limit, offset } = props;

	const { id, title, slug, imageId, summary } = spotlightArticles;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(spotlightArticles)
		.limit(limit)
		.offset(offset);
	return data;
}

export async function getSpotLightArticle(props: ParamProps) {
	const { id: spotlightArticleId } = props;

	const { id, title, slug, imageId, summary } = spotlightArticles;

	const data = await db
		.select({ id, title, slug, imageId, summary })
		.from(spotlightArticles)
		.where(eq(id, spotlightArticleId));
	return data;
}
