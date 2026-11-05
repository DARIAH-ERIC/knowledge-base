import { replaceNonBreakingSpaces } from "@dariah-eric/database/rich-text-normalize";
import * as v from "valibot";

/**
 * An optional plain-text summary. A summary the form sends empty arrives as `undefined`, and is
 * stored as `null`.
 */
export const OptionalSummaryInputSchema = v.nullish(
	v.pipe(v.string(), v.nonEmpty(), v.transform(replaceNonBreakingSpaces)),
	null,
);
