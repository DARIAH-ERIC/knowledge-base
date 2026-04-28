import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { count, desc, ilike, or } from "@/lib/db/sql";

export type UsersSort = "name" | "email" | "role" | "isEmailVerified";

interface GetUsersParams {
	limit: number;
	offset: number;
	q?: string;
	sort?: UsersSort;
	dir?: "asc" | "desc";
}

export interface UsersResult {
	data: Array<Pick<schema.User, "email" | "id" | "isEmailVerified" | "name" | "role">>;
	limit: number;
	offset: number;
	total: number;
}

export async function getUsers(params: Readonly<GetUsersParams>): Promise<UsersResult> {
	const { limit, offset, q, sort = "name", dir = "asc" } = params;
	const query = q?.trim();
	const where =
		query != null && query !== ""
			? or(ilike(schema.users.name, `%${query}%`), ilike(schema.users.email, `%${query}%`))
			: undefined;

	const orderBy =
		sort === "email"
			? dir === "asc"
				? schema.users.email
				: desc(schema.users.email)
			: sort === "role"
				? dir === "asc"
					? schema.users.role
					: desc(schema.users.role)
				: sort === "isEmailVerified"
					? dir === "asc"
						? schema.users.isEmailVerified
						: desc(schema.users.isEmailVerified)
					: dir === "asc"
						? schema.users.name
						: desc(schema.users.name);

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
			.orderBy(orderBy)
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
