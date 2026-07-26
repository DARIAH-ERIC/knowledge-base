import { assetPrefixes } from "@dariah-eric/storage/config";
import * as v from "valibot";

/**
 * Storage keys are exactly `prefix/name`, so the route takes the two segments separately rather
 * than one slash-bearing parameter. The prefix is constrained to the known set and the name to
 * key-safe characters, so the path cannot be used to probe the bucket for arbitrary object names.
 */
export const GetAssetDownload = {
	ParamsSchema: v.object({
		prefix: v.picklist(assetPrefixes),
		name: v.pipe(v.string(), v.regex(/^[\w.-]+$/, "Must be a storage object name.")),
	}),
};
