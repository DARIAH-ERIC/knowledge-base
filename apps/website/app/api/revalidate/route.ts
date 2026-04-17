import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env.config";

export const cacheTags = {
	documentsPolicies: "documents-policies",
	events: "events",
	home: "home",
	impactCaseStudies: "impact-case-studies",
	membersAndPartners: "members-partners",
	navigation: "navigation",
	news: "news",
	newsletters: "newsletters",
	pages: "pages",
	persons: "persons",
	projects: "projects",
	siteMetadata: "site-metadata",
	spotlightArticles: "spotlight-articles",
	workingGroups: "working-groups",
} as const;

type EntityType =
	| "documents-policies"
	| "events"
	| "impact-case-studies"
	| "site-metadata"
	| "navigation"
	| "news"
	| "pages"
	| "spotlight-articles";

const entityTypeToCacheTags: Record<
	EntityType,
	Array<(typeof cacheTags)[keyof typeof cacheTags]>
> = {
	"documents-policies": [cacheTags.documentsPolicies],
	events: [cacheTags.events],
	"impact-case-studies": [cacheTags.impactCaseStudies],
	"site-metadata": [cacheTags.siteMetadata],
	navigation: [cacheTags.navigation],
	news: [cacheTags.news],
	pages: [cacheTags.pages],
	"spotlight-articles": [cacheTags.spotlightArticles],
};

export async function POST(request: NextRequest): Promise<NextResponse> {
	const secret = env.REVALIDATION_WEBHOOK_SECRET;
	if (secret == null) {
		return new NextResponse(null, { status: 404 });
	}

	const authorization = request.headers.get("authorization");
	if (authorization !== `Bearer ${secret}`) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = (await request.json()) as { type?: string };
	const entityType = body.type as EntityType | undefined;

	if (entityType == null || !(entityType in entityTypeToCacheTags)) {
		return NextResponse.json({ message: "Bad Request" }, { status: 400 });
	}

	for (const tag of entityTypeToCacheTags[entityType]) {
		revalidateTag(tag, "max");
	}

	return NextResponse.json({ revalidated: true });
}
