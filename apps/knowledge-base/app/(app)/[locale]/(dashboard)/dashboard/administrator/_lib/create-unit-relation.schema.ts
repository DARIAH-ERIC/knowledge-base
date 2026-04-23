import * as v from "valibot";

export const CreateUnitRelationActionInputSchema = v.object({
	unitId: v.pipe(v.string(), v.uuid()),
	statusId: v.pipe(v.string(), v.uuid()),
	relatedUnitId: v.pipe(v.string(), v.uuid()),
	duration: v.object({
		start: v.pipe(v.string(), v.isoDate(), v.toDate()),
		end: v.optional(v.pipe(v.string(), v.isoDate(), v.toDate())),
	}),
});
