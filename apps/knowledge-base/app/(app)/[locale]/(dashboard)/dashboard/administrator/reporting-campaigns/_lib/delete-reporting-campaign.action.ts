"use server";

import { eq } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";
import { revalidatePath } from "next/cache";

import { assertAdmin } from "@/lib/auth/session";

export async function deleteReportingCampaignAction(id: string): Promise<void> {
	await assertAdmin();

	await db.delete(schema.reportingCampaigns).where(eq(schema.reportingCampaigns.id, id));

	revalidatePath("/[locale]/dashboard/administrator/reporting-campaigns", "layout");
}
