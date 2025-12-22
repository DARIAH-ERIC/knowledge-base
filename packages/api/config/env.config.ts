/* eslint-disable no-restricted-syntax */

import { err, isErr, ok } from "@acdh-oeaw/lib";
import { ValidationError } from "@acdh-oeaw/validate-env";
import { createEnv } from "@acdh-oeaw/validate-env/runtime";
import * as v from "valibot";

const result = createEnv({
	schema(environment) {
		const schema = v.object({
			API_HOST: v.pipe(v.string(), v.nonEmpty()),
			API_PORT: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
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
		API_HOST: process.env.API_HOST,
		API_PORT: process.env.API_PORT,
		NODE_ENV: process.env.NODE_ENV,
	},
	validation: v.parse(
		v.optional(v.picklist(["disabled", "enabled"]), "enabled"),
		process.env.ENV_VALIDATION,
	),
});

if (isErr(result)) {
	delete result.error.stack;
	throw result.error;
}

export const env = result.value;
