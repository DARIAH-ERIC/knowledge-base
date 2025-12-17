import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => {
	return {
		country: {
			status: r.one.countries({
				from: r.countryStatuses.countryId,
				to: r.countries.id,
			}),
		},
		nationalConsortia: {
			status: r.one.nationalConsortia({
				from: r.countryStatuses.ncId,
				to: r.nationalConsortia.id,
			}),
		},
	};
});
