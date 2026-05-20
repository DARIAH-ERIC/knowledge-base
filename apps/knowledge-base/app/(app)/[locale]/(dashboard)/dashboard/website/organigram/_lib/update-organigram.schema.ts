import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

export const UpdateOrganigramNodeSchema = v.object({
	id: v.pipe(v.string(), v.uuid()),
	label: v.pipe(v.string(), v.nonEmpty()),
	description: v.nullish(v.pipe(v.string()), null),
	position: v.nullish(v.pipe(v.number(), v.integer()), null),
	kind: v.picklist(schema.organigramNodeKindsEnum),
});

export const UpdateOrganigramActionInputSchema = v.object({
	nodes: v.array(UpdateOrganigramNodeSchema),
});
