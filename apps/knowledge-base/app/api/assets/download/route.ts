import { Readable } from "node:stream";

import { db } from "@dariah-eric/database/client";
import { type NextRequest, NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export async function GET(request: NextRequest): Promise<NextResponse> {
	const { session } = await getCurrentSession();

	if (session == null) {
		return new NextResponse(null, { status: 401 });
	}

	const key = request.nextUrl.searchParams.get("key");

	if (key == null) {
		return new NextResponse(null, { status: 400 });
	}

	const asset = await db.query.assets.findFirst({
		where: { key },
		columns: { filename: true, label: true },
	});

	if (asset == null) {
		return new NextResponse(null, { status: 404 });
	}

	const filename = asset.filename ?? asset.label;

	const stream = await storage.objects.get({ key });

	const webStream = Readable.toWeb(stream) as ReadableStream<Uint8Array>;

	return new NextResponse(webStream, {
		headers: {
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Type": "application/octet-stream",
		},
	});
}
