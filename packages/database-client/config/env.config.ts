/* eslint-disable no-restricted-syntax */

import * as v from "valibot";

const schema = v.object({
	DATABASE_HOST: v.pipe(v.string(), v.nonEmpty()),
	DATABASE_NAME: v.pipe(v.string(), v.nonEmpty()),
	DATABASE_PASSWORD: v.pipe(v.string(), v.nonEmpty()),
	DATABASE_PORT: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
	DATABASE_SSL_CONNECTION: v.optional(v.picklist(["disabled", "enabled"]), "disabled"),
	DATABASE_USER: v.pipe(v.string(), v.nonEmpty()),
	NODE_ENV: v.optional(v.picklist(["development", "production", "test"]), "production"),
});

const result = v.safeParse(schema, process.env);

if (!result.success) {
	throw new Error(`Invalid or missing environment variables.\n${v.summarize(result.issues)}`);
}

export const env = result.output;
