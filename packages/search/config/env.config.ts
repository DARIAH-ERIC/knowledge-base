/* eslint-disable no-restricted-syntax */

import { define } from "@dariah-eric/env";
import * as v from "valibot";

const validate = define({
	envVars: v.object({
		NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME: v.pipe(v.string(), v.nonEmpty()),
		NEXT_PUBLIC_TYPESENSE_HOST: v.pipe(v.string(), v.nonEmpty()),
		NEXT_PUBLIC_TYPESENSE_PORT: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
		NEXT_PUBLIC_TYPESENSE_PROTOCOL: v.optional(v.picklist(["http", "https"]), "https"),
		/**
		 * Optional, because we need to be able to create a collection, before we create
		 * a search-only api key for that collection.
		 */
		NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY: v.optional(v.pipe(v.string(), v.nonEmpty())),
		TYPESENSE_ADMIN_API_KEY: v.pipe(v.string(), v.nonEmpty()),
	}),
});

export const env = validate({
	environment: {
		NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME:
			process.env.NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME,
		NEXT_PUBLIC_TYPESENSE_HOST: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
		NEXT_PUBLIC_TYPESENSE_PORT: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
		NEXT_PUBLIC_TYPESENSE_PROTOCOL: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
		NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY,
		TYPESENSE_ADMIN_API_KEY: process.env.TYPESENSE_ADMIN_API_KEY,
	},
}).unwrap();
