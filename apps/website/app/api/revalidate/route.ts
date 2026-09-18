import { log } from "@acdh-oeaw/lib";
import { parseRevalidationWebhookPayload } from "@dariah-eric/cache-tags";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env.config";

/**
 * Revalidation webhook, documented as `webhooks.revalidate` in the api's openapi document. The
 * payload carries `@dariah-eric/cache-tags` tags; fetches are tagged with the `x-cache-tags` each
 * api operation declares, so nothing here needs to map content types to pages.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	const secret = env.REVALIDATION_WEBHOOK_SECRET;
	if (secret == null) {
		return new NextResponse(null, { status: 404 });
	}

	const authorization = request.headers.get("authorization");
	if (authorization !== `Bearer ${secret}`) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const payload = parseRevalidationWebhookPayload(await request.json().catch(() => null));

	if (payload == null) {
		return NextResponse.json({ message: "Bad Request" }, { status: 400 });
	}

	log.info("[revalidation webhook] received request", { tags: payload.tags });

	for (const tag of payload.tags) {
		revalidateTag(tag, "max");
	}

	return NextResponse.json({ revalidated: true });
}
