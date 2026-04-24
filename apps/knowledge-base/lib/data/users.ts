import { asc, count, ilike, or } from "@dariah-eric/database";
import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

interface GetUsersParams {
	limit: number;
	offset: number;
	q?: string;
}

export interface UsersResult {
	data: Array<Pick<schema.User, "email" | "id" | "isEmailVerified" | "name" | "role">>;
	limit: number;
	offset: number;
	total: number;
}

export async function getUsers(params: Readonly<GetUsersParams>): Promise<UsersResult> {
	const { limit, offset, q } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(ilike(schema.users.name, `%${query}%`), ilike(schema.users.email, `%${query}%`))
			: undefined;

	const [items, aggregate] = await Promise.all([
		db
			.select({
				email: schema.users.email,
				id: schema.users.id,
				isEmailVerified: schema.users.isEmailVerified,
				name: schema.users.name,
				role: schema.users.role,
			})
			.from(schema.users)
			.where(where)
			.orderBy(asc(schema.users.name))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.users).where(where),
	]);

	return {
		data: items,
		limit,
		offset,
		total: aggregate.at(0)?.total ?? 0,
	};
}
