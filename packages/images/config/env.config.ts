/* eslint-disable no-restricted-syntax */

import { err, isErr, ok } from "@acdh-oeaw/lib";
import { ValidationError } from "@acdh-oeaw/validate-env";
import { createEnv } from "@acdh-oeaw/validate-env/runtime";
import * as v from "valibot";

const result = createEnv({
	schema(environment) {
		const schema = v.object({
			IMGPROXY_BASE_URL: v.pipe(v.string(), v.url()),
			IMGPROXY_KEY: v.pipe(v.string(), v.nonEmpty()),
			IMGPROXY_SALT: v.pipe(v.string(), v.nonEmpty()),
			NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "production"),
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
		IMGPROXY_BASE_URL: process.env.IMGPROXY_BASE_URL,
		IMGPROXY_KEY: process.env.IMGPROXY_KEY,
		IMGPROXY_SALT: process.env.IMGPROXY_SALT,
		NODE_ENV: process.env.NODE_ENV,
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
