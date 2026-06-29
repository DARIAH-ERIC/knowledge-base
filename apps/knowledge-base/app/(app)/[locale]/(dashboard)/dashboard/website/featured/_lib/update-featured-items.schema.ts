import * as v from "valibot";

export const UpdateFeaturedItemsActionInputSchema = v.object({
	featuredItemIds: v.optional(v.array(v.string()), []),
});
