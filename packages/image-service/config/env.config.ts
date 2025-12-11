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
			S3_ACCESS_KEY: v.pipe(v.string(), v.nonEmpty()),
			S3_BUCKET: v.pipe(v.string(), v.nonEmpty()),
			S3_HOST: v.pipe(v.string(), v.nonEmpty()),
			S3_PORT: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
			S3_PROTOCOL: v.optional(v.picklist(["http", "https"]), "https"),
			S3_SECRET_KEY: v.pipe(v.string(), v.nonEmpty()),
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
		S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
		S3_BUCKET: process.env.S3_BUCKET,
		S3_HOST: process.env.S3_HOST,
		S3_PORT: process.env.S3_PORT,
		S3_PROTOCOL: process.env.S3_PROTOCOL,
		S3_SECRET_KEY: process.env.S3_SECRET_KEY,
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
