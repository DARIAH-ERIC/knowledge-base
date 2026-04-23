/* eslint-disable no-restricted-syntax */

import { define } from "@dariah-eric/env";
import * as v from "valibot";

const validate = define({
	envVars: v.object({
		TYPESENSE_RESOURCE_COLLECTION_NAME: v.pipe(v.string(), v.nonEmpty()),
		TYPESENSE_WEBSITE_COLLECTION_NAME: v.pipe(v.string(), v.nonEmpty()),
		TYPESENSE_HOST: v.pipe(v.string(), v.nonEmpty()),
		TYPESENSE_PORT: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
		TYPESENSE_PROTOCOL: v.optional(v.picklist(["http", "https"]), "https"),
		TYPESENSE_SEARCH_API_KEY: v.optional(v.pipe(v.string(), v.nonEmpty())),
		TYPESENSE_ADMIN_API_KEY: v.pipe(v.string(), v.nonEmpty()),
	}),
});

export const env = validate({
	environment: {
		TYPESENSE_RESOURCE_COLLECTION_NAME: process.env.TYPESENSE_RESOURCE_COLLECTION_NAME,
		TYPESENSE_WEBSITE_COLLECTION_NAME: process.env.TYPESENSE_WEBSITE_COLLECTION_NAME,
		TYPESENSE_HOST: process.env.TYPESENSE_HOST,
		TYPESENSE_PORT: process.env.TYPESENSE_PORT,
		TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL,
		TYPESENSE_SEARCH_API_KEY: process.env.TYPESENSE_SEARCH_API_KEY,
		TYPESENSE_ADMIN_API_KEY: process.env.TYPESENSE_ADMIN_API_KEY,
	},
}).unwrap();
