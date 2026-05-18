import * as schema from "@dariah-eric/database/schema";

import { and, eq, or, sql, type SQL } from "@/lib/db/sql";

export function currentEntityVersionWhere(): SQL | undefined {
	return or(
		eq(schema.entityStatus.type, "draft"),
		and(
			eq(schema.entityStatus.type, "published"),
			sql`
				NOT EXISTS (
					SELECT
						1
					FROM
						"entity_versions" AS "ev2"
						INNER JOIN "entity_status" AS "es2" ON "ev2"."status_id" = "es2"."id"
					WHERE
						"ev2"."entity_id" = ${schema.entityVersions.entityId}
						AND "es2"."type" = 'draft'
				)
			`,
		),
	);
}
