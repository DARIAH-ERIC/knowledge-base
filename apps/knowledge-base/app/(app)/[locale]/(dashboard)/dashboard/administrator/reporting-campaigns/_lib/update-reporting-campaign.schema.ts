import * as v from "valibot";

import { reportingCampaignStatusEnum } from "@dariah-eric/database/schema";

export const UpdateReportingCampaignActionInputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	year: v.pipe(v.string(), v.nonEmpty(), v.transform(Number), v.integer(), v.minValue(2000)),
	status: v.picklist(reportingCampaignStatusEnum),
});
