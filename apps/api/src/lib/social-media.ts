import type * as schema from "@dariah-eric/database/schema";

import { type SQL, type asc, sql } from "@/services/db/sql";

/** Order a many-to-many social-media relation by its junction row. */
export const socialMediaByPosition = {
	orderBy(
		_table: typeof schema.socialMedia,
		operators: { asc: typeof asc; sql: typeof sql },
	): Array<ReturnType<typeof asc>> {
		return [operators.asc(operators.sql.identifier("position")), operators.asc(_table.id)];
	},
};

/**
 * Leave out social media accounts whose duration has ended. Accounts without a duration are always
 * included.
 */
export const activeSocialMedia = {
	where: {
		// `<<` is "strictly left of", i.e. every instant of the duration precedes now.
		RAW(t: typeof schema.socialMedia): SQL {
			return sql`(${t.duration} IS NULL OR NOT ${t.duration} << TSTZRANGE(NOW()::TIMESTAMPTZ, NULL))`;
		},
	},
};

export function mapSocialMedia<
	T extends {
		type: { type: string };
		duration: { start?: Date | null; end?: Date | null } | null;
	},
>(
	socialMedia: Array<T>,
): Array<
	Omit<T, "type" | "duration"> & {
		type: string;
		duration: { start: string | null; end: string | null } | null;
	}
> {
	return socialMedia.map((sm) => {
		return {
			...sm,
			type: sm.type.type,
			duration: sm.duration
				? {
						start: sm.duration.start?.toISOString() ?? null,
						end: sm.duration.end?.toISOString() ?? null,
					}
				: null,
		};
	});
}
