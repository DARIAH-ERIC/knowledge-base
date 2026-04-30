/* eslint-disable no-restricted-syntax */

import { define } from "@dariah-eric/env";
import * as v from "valibot";

const validate = define({
	envVars: v.object({
		ADMIN_EMAIL: v.pipe(v.string(), v.trim(), v.nonEmpty(), v.email()),
		ADMIN_NAME: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		ADMIN_PASSWORD: v.pipe(v.string(), v.trim(), v.nonEmpty()),
		AUTH_ENCRYPTION_KEY: v.pipe(v.string(), v.length(32)),
		DATABASE_HOST: v.pipe(v.string(), v.nonEmpty()),
		DATABASE_NAME: v.pipe(v.string(), v.nonEmpty()),
		DATABASE_PASSWORD: v.pipe(v.string(), v.minLength(8)),
		DATABASE_PORT: v.pipe(v.string(), v.toNumber(), v.integer(), v.minValue(1)),
		DATABASE_SSL_CONNECTION: v.optional(v.picklist(["disabled", "enabled"]), "disabled"),
		DATABASE_USER: v.pipe(v.string(), v.nonEmpty()),
	}),
});

export const env = validate({
	environment: {
		ADMIN_EMAIL: process.env.ADMIN_EMAIL,
		ADMIN_NAME: process.env.ADMIN_NAME,
		ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
		AUTH_ENCRYPTION_KEY: process.env.AUTH_ENCRYPTION_KEY,
		DATABASE_HOST: process.env.DATABASE_HOST,
		DATABASE_NAME: process.env.DATABASE_NAME,
		DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
		DATABASE_PORT: process.env.DATABASE_PORT,
		DATABASE_SSL_CONNECTION: process.env.DATABASE_SSL_CONNECTION,
		DATABASE_USER: process.env.DATABASE_USER,
	},
}).unwrap();
