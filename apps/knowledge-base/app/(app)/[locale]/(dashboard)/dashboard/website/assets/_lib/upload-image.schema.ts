import * as v from "valibot";

import { imageMimeTypes, imageSizeLimit } from "@/config/assets.config";

export const UploadImageInputSchema = v.object({
	file: v.pipe(
		v.file(),
		v.mimeType(imageMimeTypes),
		v.check((input) => {
			return input.size <= imageSizeLimit;
		}),
	),
});
