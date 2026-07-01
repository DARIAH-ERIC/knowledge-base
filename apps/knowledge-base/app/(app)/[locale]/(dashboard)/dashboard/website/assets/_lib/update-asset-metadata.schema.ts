import * as v from "valibot";

import { RichTextCaptionFormSchema } from "@/lib/rich-text-caption";

const OptionalTextSchema = v.pipe(
	v.optional(v.string()),
	v.transform((value) => {
		const trimmed = value?.trim();

		return trimmed !== "" ? trimmed : null;
	}),
);

const OptionalLicenseSchema = v.pipe(
	v.optional(v.string()),
	v.transform((value) => (value != null && value !== "" && value !== "none" ? value : null)),
);

export const UpdateAssetMetadataInputSchema = v.object({
	id: v.pipe(v.string(), v.nonEmpty()),
	label: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	alt: OptionalTextSchema,
	caption: RichTextCaptionFormSchema,
	licenseId: OptionalLicenseSchema,
});
