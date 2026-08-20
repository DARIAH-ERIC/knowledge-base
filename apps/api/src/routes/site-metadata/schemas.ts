import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

import { ImageSchema } from "@/lib/schemas";

/**
 * Global site metadata. `email` and `socialMedia` are DARIAH-EU's own contact details, folded in
 * from the `dariah-eu` ERIC organisational unit: the ERIC has no entity page and no endpoint of its
 * own, so this is where consumers read the site-wide contact address and social accounts. Both fall
 * back to empty when the ERIC has no published version.
 */
export const SiteMetadataSchema = v.pipe(
	v.object({
		...v.pick(schema.SiteMetadataSelectSchema, ["title", "description", "ogTitle", "ogDescription"])
			.entries,
		ogImage: v.nullable(ImageSchema),
		...v.pick(schema.OrganisationalUnitSelectSchema, ["email"]).entries,
		socialMedia: v.array(
			v.object({
				...v.pick(schema.SocialMediaSelectSchema, ["id", "name", "url"]).entries,
				duration: v.nullable(
					v.object({
						start: v.string(),
						end: v.nullable(v.string()),
					}),
				),
				type: v.picklist(schema.socialMediaTypesEnum),
			}),
		),
	}),
	v.description("Site metadata"),
	v.metadata({ ref: "SiteMetadata" }),
);

export type SiteMetadata = v.InferOutput<typeof SiteMetadataSchema>;

export const GetSiteMetadata = {
	ResponseSchema: v.pipe(
		SiteMetadataSchema,
		v.description("Site metadata"),
		v.metadata({ ref: "GetSiteMetadataResponse" }),
	),
};
