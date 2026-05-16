import { log } from "@acdh-oeaw/lib";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env.config";

export const cacheTags = {
	dariahProjects: "dariah-projects",
	documentsPolicies: "documents-policies",
	events: "events",
	fundingCalls: "funding-calls",
	governanceBodies: "governance-bodies",
	home: "home",
	impactCaseStudies: "impact-case-studies",
	membersAndPartners: "members-partners",
	navigation: "navigation",
	news: "news",
	newsletters: "newsletters",
	organigram: "organigram",
	opportunities: "opportunities",
	pages: "pages",
	persons: "persons",
	projects: "projects",
	siteMetadata: "site-metadata",
	spotlightArticles: "spotlight-articles",
	workingGroups: "working-groups",
} as const;

type EntityType =
	| "dariah-projects"
	| "documents-policies"
	| "events"
	| "funding-calls"
	| "governance-bodies"
	| "impact-case-studies"
	| "members-partners"
	| "site-metadata"
	| "navigation"
	| "news"
	| "organigram"
	| "opportunities"
	| "pages"
	| "persons"
	| "spotlight-articles"
	| "working-groups";

const entityTypeToCacheTags: Record<
	EntityType,
	Array<(typeof cacheTags)[keyof typeof cacheTags]>
> = {
	"dariah-projects": [cacheTags.dariahProjects, cacheTags.projects],
	"documents-policies": [cacheTags.documentsPolicies],
	events: [cacheTags.events],
	"funding-calls": [cacheTags.fundingCalls],
	"governance-bodies": [cacheTags.governanceBodies],
	"impact-case-studies": [cacheTags.impactCaseStudies],
	"members-partners": [cacheTags.membersAndPartners],
	"site-metadata": [cacheTags.siteMetadata],
	navigation: [cacheTags.navigation],
	news: [cacheTags.news],
	organigram: [cacheTags.organigram],
	opportunities: [cacheTags.opportunities],
	pages: [cacheTags.pages],
	persons: [cacheTags.persons],
	"spotlight-articles": [cacheTags.spotlightArticles],
	"working-groups": [cacheTags.workingGroups],
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

	const tags = entityTypeToCacheTags[entityType];

	log.info("[revalidation webhook] received request", {
		entityType,
		tags,
	});

	for (const tag of tags) {
		revalidateTag(tag, "max");
	}

	return NextResponse.json({ revalidated: true });
}
