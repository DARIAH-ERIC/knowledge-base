/* eslint-disable no-restricted-syntax */

import * as v from "valibot";

const schema = v.object({
	NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME: v.pipe(v.string(), v.nonEmpty()),
	NEXT_PUBLIC_TYPESENSE_HOST: v.pipe(v.string(), v.nonEmpty()),
	NEXT_PUBLIC_TYPESENSE_PORT: v.pipe(
		v.string(),
		v.transform(Number),
		v.number(),
		v.integer(),
		v.minValue(1),
	),
	NEXT_PUBLIC_TYPESENSE_PROTOCOL: v.optional(v.picklist(["http", "https"]), "https"),
	/**
	 * Optional, because we need to be able to create a collection, before we create
	 * a search-only api key for that collection.
	 */
	NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY: v.optional(v.pipe(v.string(), v.nonEmpty())),
	NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "production"),
	TYPESENSE_ADMIN_API_KEY: v.pipe(v.string(), v.nonEmpty()),
});

const result = v.safeParse(schema, process.env);

if (!result.success) {
	throw new Error(`Invalid or missing environment variables.\n${v.summarize(result.issues)}`);
}

export const env = result.output;
