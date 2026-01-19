/* eslint-disable no-restricted-syntax */

import { err, isErr, ok } from "@acdh-oeaw/lib";
import { ValidationError } from "@acdh-oeaw/validate-env";
import { createEnv } from "@acdh-oeaw/validate-env/runtime";
import * as v from "valibot";

const result = createEnv({
	schema(environment) {
		const schema = v.object({
			API_ALLOWED_ORIGINS: v.optional(
				v.pipe(
					v.string(),
					v.nonEmpty(),
					v.transform((value) => {
						return value.split(",");
					}),
					v.array(v.pipe(v.string(), v.trim(), v.url())),
				),
			),
			API_BASE_URL: v.pipe(v.string(), v.url()),
			API_LOG_LEVEL: v.optional(
				v.picklist(["silent", "fatal", "error", "warn", "info", "debug", "trace"]),
				"info",
			),
			API_PORT: v.optional(v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1))),
			CI: v.optional(v.pipe(v.unknown(), v.toBoolean())),
			DATABASE_HOST: v.pipe(v.string(), v.nonEmpty()),
			DATABASE_NAME: v.pipe(v.string(), v.nonEmpty()),
			DATABASE_PASSWORD: v.pipe(v.string(), v.minLength(8)),
			DATABASE_PORT: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
			DATABASE_SSL_CONNECTION: v.optional(v.picklist(["disabled", "enabled"]), "disabled"),
			DATABASE_USER: v.pipe(v.string(), v.nonEmpty()),
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
		API_ALLOWED_ORIGINS: process.env.API_ALLOWED_ORIGINS,
		API_BASE_URL: process.env.API_BASE_URL,
		API_LOG_LEVEL: process.env.API_LOG_LEVEL,
		API_PORT: process.env.API_PORT,
		CI: process.env.CI,
		DATABASE_HOST: process.env.DATABASE_HOST,
		DATABASE_NAME: process.env.DATABASE_NAME,
		DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
		DATABASE_PORT: process.env.DATABASE_PORT,
		DATABASE_SSL_CONNECTION: process.env.DATABASE_SSL_CONNECTION,
		DATABASE_USER: process.env.DATABASE_USER,
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
