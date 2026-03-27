import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getAssetsForDashboard } from "@/lib/data/assets";
import { imageGridOptions } from "@/config/assets.config";

export async function GET(request: NextRequest) {
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
