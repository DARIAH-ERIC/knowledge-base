import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "@/config/env.config";

export async function POST(request: NextRequest): Promise<NextResponse> {
	const secret = env.REVALIDATION_WEBHOOK_SECRET;

	const authorization = request.headers.get("authorization");
	const token = authorization?.startsWith("Bearer ") === true ? authorization.slice(7) : null;

	if (secret == null || token !== secret) {
		return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
	}

	const body = (await request.json()) as { type?: string };

	if (typeof body.type !== "string") {
		return NextResponse.json({ message: "Bad Request" }, { status: 400 });
	}

	revalidateTag(body.type, "max");

	return NextResponse.json({ revalidated: true });
}
