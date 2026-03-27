import { type NextRequest, NextResponse } from "next/server";

import { imageGridOptions } from "@/config/assets.config";
import { getCurrentSession } from "@/lib/auth/session";
import { getAssetsForDashboard } from "@/lib/data/assets";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const { session } = await getCurrentSession();

	if (session == null) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const searchParams = request.nextUrl.searchParams;
	const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

	const { items, total } = await getAssetsForDashboard({
		imageUrlOptions: imageGridOptions,
		limit,
	});

	return NextResponse.json({ items, total });
}
