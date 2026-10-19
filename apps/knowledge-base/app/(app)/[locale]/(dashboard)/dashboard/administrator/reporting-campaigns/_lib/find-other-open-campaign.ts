import { db } from "@/lib/db";

/**
 * Reporting campaigns are annual, so at most one may be open at a time: the reporting overview and
 * the reporting scope resolve "the current campaign" as the single open one. Returns the open
 * campaign other than `excludeId`, if any.
 */
export async function findOtherOpenCampaign(
	excludeId?: string,
): Promise<{ id: string; year: number } | null> {
	const campaign = await db.query.reportingCampaigns.findFirst({
		where: excludeId != null ? { status: "open", id: { ne: excludeId } } : { status: "open" },
		columns: { id: true, year: true },
	});

	return campaign ?? null;
}
