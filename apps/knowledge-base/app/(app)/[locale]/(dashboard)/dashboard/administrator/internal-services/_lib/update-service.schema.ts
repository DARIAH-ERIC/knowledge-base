import * as v from "valibot";

export const UpdateServiceActionInputSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	name: v.pipe(v.string(), v.nonEmpty()),
	statusId: v.pipe(v.string(), v.uuid()),
	comment: v.optional(v.pipe(v.string(), v.nonEmpty())),
	dariahBranding: v.pipe(
		v.optional(v.string()),
		v.transform((s) => s === "true"),
	),
	monitoring: v.pipe(
		v.optional(v.string()),
		v.transform((s) => s === "true"),
	),
	privateSupplier: v.pipe(
		v.optional(v.string()),
		v.transform((s) => s === "true"),
	),
	metadata: v.optional(v.pipe(v.looseObject({}))),
	ownerUnitIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	providerUnitIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
});
