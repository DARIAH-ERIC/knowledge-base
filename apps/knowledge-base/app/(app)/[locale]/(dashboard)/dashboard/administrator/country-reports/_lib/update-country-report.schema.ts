import * as v from "valibot";

import { reportStatusEnum } from "@dariah-eric/database/schema";

export const UpdateCountryReportActionInputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	status: v.picklist(reportStatusEnum),
});
