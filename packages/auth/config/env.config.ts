/* eslint-disable no-restricted-syntax */

import * as v from "valibot";

const Schema = v.object({
	APP_AUTH_ENCRYPTION_KEY: v.pipe(v.string(), v.length(24)),
});

export const env = v.parse(Schema, process.env);
