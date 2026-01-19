import * as v from "valibot";

import { imageMimeTypes, imageSizeLimit } from "@/config/assets.config";
import { assetPrefixes } from "@/lib/data/assets";

export const UploadImageInputSchema = v.object({
	file: v.pipe(
		v.file(),
		v.mimeType(imageMimeTypes),
		v.check((input) => {
			return input.size <= imageSizeLimit;
		}),
	),
	licenseId: v.optional(v.pipe(v.string(), v.nonEmpty())),
	prefix: v.picklist(assetPrefixes),
});
