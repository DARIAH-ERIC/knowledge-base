import * as v from "valibot";

import { imageMimeTypes, imageSizeLimit } from "@/config/assets.config";
import { assetPrefixes } from "@/lib/data/assets";

const OptionalLicenseSchema = v.pipe(
	v.optional(v.string()),
	v.transform((value) => (value != null && value !== "" && value !== "none" ? value : undefined)),
);

export const UploadImageInputSchema = v.object({
	file: v.pipe(
		v.file(),
		v.mimeType(imageMimeTypes),
		v.check((input) => input.size <= imageSizeLimit),
	),
	licenseId: OptionalLicenseSchema,
	prefix: v.picklist(assetPrefixes),
	label: v.optional(v.pipe(v.string(), v.nonEmpty())),
	caption: v.optional(v.pipe(v.string(), v.nonEmpty())),
	alt: v.optional(v.pipe(v.string(), v.nonEmpty())),
});
