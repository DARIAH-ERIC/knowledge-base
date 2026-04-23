import * as v from "valibot";

export const CreateContributionActionInputSchema = v.object({
	personId: v.pipe(v.string(), v.uuid()),
	roleTypeId: v.pipe(v.string(), v.uuid()),
	organisationalUnitId: v.pipe(v.string(), v.uuid()),
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
});
