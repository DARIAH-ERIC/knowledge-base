/* eslint-disable no-restricted-syntax */

import * as v from "valibot";

const Schema = v.object({
	ENCRYPTION_KEY: v.pipe(v.string(), v.minLength(16)),
});

export const env = v.parse(Schema, process.env);
