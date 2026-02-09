/* eslint-disable no-restricted-syntax */

import { err, isErr, ok } from "@acdh-oeaw/lib";
import { ValidationError } from "@acdh-oeaw/validate-env";
import { createEnv } from "@acdh-oeaw/validate-env/runtime";
import * as v from "valibot";

const result = createEnv({
	schema(environment) {
		const schema = v.object({
			NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME: v.pipe(v.string(), v.nonEmpty()),
			NEXT_PUBLIC_TYPESENSE_HOST: v.pipe(v.string(), v.nonEmpty()),
			NEXT_PUBLIC_TYPESENSE_PORT: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
			NEXT_PUBLIC_TYPESENSE_PROTOCOL: v.optional(v.picklist(["http", "https"]), "https"),
			/**
			 * Optional, because we need to be able to create a collection, before we create
			 * a search-only api key for that collection.
			 */
			NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY: v.optional(v.pipe(v.string(), v.nonEmpty())),
			NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "production"),
			TYPESENSE_ADMIN_API_KEY: v.pipe(v.string(), v.nonEmpty()),
		});

		const result = v.safeParse(schema, environment);

		if (!result.success) {
			return err(
				new ValidationError(
					`Invalid or missing environment variables.\n${v.summarize(result.issues)}`,
				),
			);
		}

		return ok(result.output);
	},
	environment: {
		NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME:
			process.env.NEXT_PUBLIC_TYPESENSE_RESOURCE_COLLECTION_NAME,
		NEXT_PUBLIC_TYPESENSE_HOST: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
		NEXT_PUBLIC_TYPESENSE_PORT: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
		NEXT_PUBLIC_TYPESENSE_PROTOCOL: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
		NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY,
		NODE_ENV: process.env.NODE_ENV,
		TYPESENSE_ADMIN_API_KEY: process.env.TYPESENSE_ADMIN_API_KEY,
	},
	validation: v.parse(
		v.optional(v.picklist(["disabled", "enabled", "public"]), "enabled"),
		process.env.ENV_VALIDATION,
	),
});

if (isErr(result)) {
	delete result.error.stack;
	throw result.error;
}

export const env = result.value;
