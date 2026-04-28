import * as schema from "@dariah-eric/database/schema";
import { type NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ilike, inArray } from "@/lib/db/sql";

const defaultLimit = 20;
const allowedTypes = ["events", "news", "opportunities", "funding_calls"] as const;

type ContentBlockEntryType = (typeof allowedTypes)[number];

function isContentBlockEntryType(value: string | null): value is ContentBlockEntryType {
	return value != null && allowedTypes.includes(value as ContentBlockEntryType);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
	const { session } = await getCurrentSession();

	if (session == null) {
		return new NextResponse(null, { status: 401 });
	}

	const { searchParams } = request.nextUrl;

	const type = searchParams.get("type");
	if (!isContentBlockEntryType(type)) {
		return NextResponse.json({ items: [], total: 0 });
	}

	const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? defaultLimit), 1), 100);
	const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);
	const q = searchParams.get("q") ?? undefined;
	const idsParam = searchParams.get("ids");
	const ids =
		idsParam != null && idsParam.trim() !== "" ? idsParam.split(",").filter(Boolean) : undefined;

	if (type === "events") {
		const where =
			q != null && q.trim() !== ""
				? ilike(schema.events.title, `%${q}%`)
				: ids != null
					? inArray(schema.events.id, ids)
					: undefined;

		const [items, countResult] = await Promise.all([
			db
				.select({ id: schema.events.id, title: schema.events.title })
				.from(schema.events)
				.where(where)
				.orderBy(schema.events.title)
				.limit(limit)
				.offset(offset),
			db.$count(schema.events, where),
		]);

		return NextResponse.json({ items, total: countResult });
	}

	if (type === "news") {
		const where =
			q != null && q.trim() !== ""
				? ilike(schema.news.title, `%${q}%`)
				: ids != null
					? inArray(schema.news.id, ids)
					: undefined;

		const [items, countResult] = await Promise.all([
			db
				.select({ id: schema.news.id, title: schema.news.title })
				.from(schema.news)
				.where(where)
				.orderBy(schema.news.title)
				.limit(limit)
				.offset(offset),
			db.$count(schema.news, where),
		]);

		return NextResponse.json({ items, total: countResult });
	}

	if (type === "opportunities") {
		const where =
			q != null && q.trim() !== ""
				? ilike(schema.opportunities.title, `%${q}%`)
				: ids != null
					? inArray(schema.opportunities.id, ids)
					: undefined;

		const [items, countResult] = await Promise.all([
			db
				.select({ id: schema.opportunities.id, title: schema.opportunities.title })
				.from(schema.opportunities)
				.where(where)
				.orderBy(schema.opportunities.title)
				.limit(limit)
				.offset(offset),
			db.$count(schema.opportunities, where),
		]);

		return NextResponse.json({ items, total: countResult });
	}

	const where =
		q != null && q.trim() !== ""
			? ilike(schema.fundingCalls.title, `%${q}%`)
			: ids != null
				? inArray(schema.fundingCalls.id, ids)
				: undefined;

	const [items, countResult] = await Promise.all([
		db
			.select({ id: schema.fundingCalls.id, title: schema.fundingCalls.title })
			.from(schema.fundingCalls)
			.where(where)
			.orderBy(schema.fundingCalls.title)
			.limit(limit)
			.offset(offset),
		db.$count(schema.fundingCalls, where),
	]);

	return NextResponse.json({ items, total: countResult });
}
