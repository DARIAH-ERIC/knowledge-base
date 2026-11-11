import * as v from "valibot";

export const CreateReportingCampaignActionInputSchema = v.object({
	year: v.pipe(v.string(), v.nonEmpty(), v.transform(Number), v.integer(), v.minValue(2000)),
});
