import * as v from "valibot";

export const CreateWorkingGroupChairActionInputSchema = v.object({
	unitId: v.pipe(v.string(), v.uuid()),
	personId: v.pipe(v.string(), v.uuid()),
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
});
