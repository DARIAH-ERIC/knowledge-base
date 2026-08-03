import * as v from "valibot";

import { reportStatusEnum } from "@dariah-eric/database/schema";

export const CreateCountryReportActionInputSchema = v.object({
	campaignId: v.pipe(v.string(), v.uuid()),
	countryId: v.pipe(v.string(), v.uuid()),
	status: v.picklist(reportStatusEnum),
});
