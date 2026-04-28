import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import { db } from "@/lib/db";
import { count, desc, eq, ilike, or } from "@/lib/db/sql";

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

export interface AdminUserDetails {
	id: string;
	name: string;
	email: string;
	role: schema.User["role"];
	personId: string | null;
	organisationalUnitId: string | null;
	person: { id: string; name: string } | null;
	organisationalUnit: { id: string; name: string } | null;
}

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

async function getUsers(params: Readonly<GetUsersParams>): Promise<UsersResult> {
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

export async function getUsersForAdmin(
	currentUser: Pick<User, "role">,
	params: Readonly<GetUsersParams>,
): Promise<UsersResult> {
	assertAdminUser(currentUser);

	return getUsers(params);
}

export async function getUserForAdmin(
	currentUser: Pick<User, "role">,
	id: string,
): Promise<AdminUserDetails | null> {
	assertAdminUser(currentUser);

	const user = await db.query.users.findFirst({
		where: { id },
		columns: {
			id: true,
			name: true,
			email: true,
			role: true,
			personId: true,
			organisationalUnitId: true,
		},
	});

	if (user == null) {
		return null;
	}

	const [person, organisationalUnit] = await Promise.all([
		user.personId != null
			? db
					.select({ id: schema.persons.id, name: schema.persons.name })
					.from(schema.persons)
					.where(eq(schema.persons.id, user.personId))
					.then((rows) => {
						return rows[0] ?? null;
					})
			: null,
		user.organisationalUnitId != null
			? db
					.select({ id: schema.organisationalUnits.id, name: schema.organisationalUnits.name })
					.from(schema.organisationalUnits)
					.where(eq(schema.organisationalUnits.id, user.organisationalUnitId))
					.then((rows) => {
						return rows[0] ?? null;
					})
			: null,
	]);

	return {
		...user,
		person,
		organisationalUnit,
	};
}
