import * as v from "valibot";

import { NavigationMenuInsertSchema } from "@dariah-eric/database/schema";

export const CreateNavigationMenuActionInputSchema = v.object({
	...v.pick(NavigationMenuInsertSchema, ["name"]).entries,
});
