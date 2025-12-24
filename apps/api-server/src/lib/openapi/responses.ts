import { STATUS_CODES } from "node:http";

import { resolver } from "hono-openapi";
import * as v from "valibot";

export const BAD_REQUEST = {
	400: {
		description: STATUS_CODES[400]!,
		content: {
			"application/json": {
				schema: resolver(
					v.object({ message: v.pipe(v.string(), v.examples([STATUS_CODES[400]!])) }),
				),
			},
		},
	},
};

export const NOT_FOUND = {
	404: {
		description: STATUS_CODES[404]!,
		content: {
			"application/json": {
				schema: resolver(
					v.object({ message: v.pipe(v.string(), v.examples([STATUS_CODES[404]!])) }),
				),
			},
		},
	},
};

export const INTERNAL_SERVER_ERROR = {
	500: {
		description: STATUS_CODES[500]!,
		content: {
			"application/json": {
				schema: resolver(
					v.object({ message: v.pipe(v.string(), v.examples([STATUS_CODES[500]!])) }),
				),
			},
		},
	},
};
