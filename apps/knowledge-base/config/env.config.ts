/* eslint-disable no-restricted-syntax */

import { err, isErr, ok } from "@acdh-oeaw/lib";
import { createEnv, ValidationError } from "@acdh-oeaw/validate-env/next";
import * as v from "valibot";

const result = createEnv({
	schemas: {
		system(environment) {
			const schema = v.object({
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
		private(environment) {
			const schema = v.object({
				BUILD_MODE: v.optional(v.picklist(["export", "standalone"])),
				CI: v.optional(v.pipe(v.unknown(), v.transform(Boolean), v.boolean())),
				DATABASE_HOST: v.pipe(v.string(), v.nonEmpty()),
				DATABASE_NAME: v.pipe(v.string(), v.nonEmpty()),
				DATABASE_PASSWORD: v.pipe(v.string(), v.minLength(8)),
				DATABASE_PORT: v.pipe(
					v.string(),
					v.transform(Number),
					v.number(),
					v.integer(),
					v.minValue(1),
				),
				DATABASE_USER: v.pipe(v.string(), v.nonEmpty()),
				EMAIL_ADDRESS: v.pipe(v.string(), v.email()),
				EMAIL_SMTP_PASSWORD: v.optional(v.pipe(v.string(), v.nonEmpty())),
				EMAIL_SMTP_PORT: v.pipe(
					v.string(),
					v.transform(Number),
					v.number(),
					v.integer(),
					v.minValue(1),
				),
				EMAIL_SMTP_SERVER: v.pipe(v.string(), v.nonEmpty()),
				EMAIL_SMTP_USERNAME: v.optional(v.pipe(v.string(), v.nonEmpty())),
				MAILPIT_API_BASE_URL: v.optional(v.pipe(v.string(), v.url())),
				NEXT_RUNTIME: v.optional(v.picklist(["edge", "nodejs"])),
				SENTRY_AUTH_TOKEN: v.optional(v.pipe(v.string(), v.nonEmpty())),
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
		public(environment) {
			const schema = v.object({
				NEXT_PUBLIC_APP_BASE_URL: v.pipe(v.string(), v.url()),
				NEXT_PUBLIC_BOTS: v.optional(v.picklist(["disabled", "enabled"]), "disabled"),
				NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: v.optional(v.pipe(v.string(), v.nonEmpty())),
				NEXT_PUBLIC_IMPRINT_SERVICE_BASE_URL: v.pipe(v.string(), v.url()),
				NEXT_PUBLIC_MATOMO_BASE_URL: v.optional(v.pipe(v.string(), v.url())),
				NEXT_PUBLIC_MATOMO_ID: v.optional(
					v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
				),
				NEXT_PUBLIC_REDMINE_ID: v.pipe(
					v.string(),
					v.transform(Number),
					v.number(),
					v.integer(),
					v.minValue(1),
				),
				NEXT_PUBLIC_SENTRY_DSN: v.optional(v.pipe(v.string(), v.nonEmpty())),
				NEXT_PUBLIC_SENTRY_ORG: v.optional(v.pipe(v.string(), v.nonEmpty())),
				NEXT_PUBLIC_SENTRY_PII: v.optional(v.picklist(["disabled", "enabled"]), "disabled"),
				NEXT_PUBLIC_SENTRY_PROJECT: v.optional(v.pipe(v.string(), v.nonEmpty())),
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
	},
	environment: {
		BUILD_MODE: process.env.BUILD_MODE,
		CI: process.env.CI,
		DATABASE_HOST: process.env.DATABASE_HOST,
		DATABASE_NAME: process.env.DATABASE_NAME,
		DATABASE_PASSWORD: process.env.DATABASE_PASSWORD,
		DATABASE_PORT: process.env.DATABASE_PORT,
		DATABASE_USER: process.env.DATABASE_USER,
		EMAIL_ADDRESS: process.env.EMAIL_ADDRESS,
		EMAIL_SMTP_PASSWORD: process.env.EMAIL_SMTP_PASSWORD,
		EMAIL_SMTP_PORT: process.env.EMAIL_SMTP_PORT,
		EMAIL_SMTP_SERVER: process.env.EMAIL_SMTP_SERVER,
		EMAIL_SMTP_USERNAME: process.env.EMAIL_SMTP_USERNAME,
		MAILPIT_API_BASE_URL: process.env.MAILPIT_API_BASE_URL,
		NEXT_PUBLIC_APP_BASE_URL: process.env.NEXT_PUBLIC_APP_BASE_URL,
		NEXT_PUBLIC_BOTS: process.env.NEXT_PUBLIC_BOTS,
		NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
		NEXT_PUBLIC_IMPRINT_SERVICE_BASE_URL: process.env.NEXT_PUBLIC_IMPRINT_SERVICE_BASE_URL,
		NEXT_PUBLIC_MATOMO_BASE_URL: process.env.NEXT_PUBLIC_MATOMO_BASE_URL,
		NEXT_PUBLIC_MATOMO_ID: process.env.NEXT_PUBLIC_MATOMO_ID,
		NEXT_PUBLIC_REDMINE_ID: process.env.NEXT_PUBLIC_REDMINE_ID,
		NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
		NEXT_PUBLIC_SENTRY_ORG: process.env.NEXT_PUBLIC_SENTRY_ORG,
		NEXT_PUBLIC_SENTRY_PII: process.env.NEXT_PUBLIC_SENTRY_PII,
		NEXT_PUBLIC_SENTRY_PROJECT: process.env.NEXT_PUBLIC_SENTRY_PROJECT,
		NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME: process.env.NEXT_PUBLIC_TYPESENSE_COLLECTION_NAME,
		NEXT_PUBLIC_TYPESENSE_HOST: process.env.NEXT_PUBLIC_TYPESENSE_HOST,
		NEXT_PUBLIC_TYPESENSE_PORT: process.env.NEXT_PUBLIC_TYPESENSE_PORT,
		NEXT_PUBLIC_TYPESENSE_PROTOCOL: process.env.NEXT_PUBLIC_TYPESENSE_PROTOCOL,
		NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_API_KEY,
		NEXT_RUNTIME: process.env.NEXT_RUNTIME,
		NODE_ENV: process.env.NODE_ENV,
		SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
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
