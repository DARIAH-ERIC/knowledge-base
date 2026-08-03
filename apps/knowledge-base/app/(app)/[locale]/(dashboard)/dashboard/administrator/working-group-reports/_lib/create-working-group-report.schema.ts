import * as v from "valibot";

import { reportStatusEnum } from "@dariah-eric/database/schema";

export const CreateWorkingGroupReportActionInputSchema = v.object({
	campaignId: v.pipe(v.string(), v.uuid()),
	workingGroupId: v.pipe(v.string(), v.uuid()),
	status: v.picklist(reportStatusEnum),
});
