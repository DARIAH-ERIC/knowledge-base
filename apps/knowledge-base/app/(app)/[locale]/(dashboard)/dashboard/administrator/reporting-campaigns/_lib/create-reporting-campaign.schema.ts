import * as v from "valibot";

import { reportingCampaignStatusEnum } from "@dariah-eric/database/schema";

export const CreateReportingCampaignActionInputSchema = v.object({
	year: v.pipe(v.string(), v.nonEmpty(), v.transform(Number), v.integer(), v.minValue(2000)),
	status: v.picklist(reportingCampaignStatusEnum),
});
