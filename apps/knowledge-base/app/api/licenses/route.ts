import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getLicenseOptions } from "@/lib/data/licenses";

export async function GET(): Promise<NextResponse> {
	const { session } = await getCurrentSession();

	if (session == null) {
		return new NextResponse(null, { status: 401 });
	}

	const items = await getLicenseOptions();

	return NextResponse.json({ items });
}
