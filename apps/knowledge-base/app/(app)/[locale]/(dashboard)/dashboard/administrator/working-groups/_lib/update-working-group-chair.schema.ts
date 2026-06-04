import * as v from "valibot";

import { CreateWorkingGroupChairActionInputSchema } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-groups/_lib/create-working-group-chair.schema";

export const UpdateWorkingGroupChairActionInputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	...CreateWorkingGroupChairActionInputSchema.entries,
});
