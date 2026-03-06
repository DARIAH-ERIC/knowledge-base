import { connection } from "next/server";
import type { ReactNode } from "react";

interface AuthLayoutProps extends LayoutProps<"/[locale]/auth"> {}

export default async function AuthLayout(props: Readonly<AuthLayoutProps>): Promise<ReactNode> {
	const { children } = props;

	/**
	 * We cannot access the database when building the app in github actions,
	 * so we need to ensure that all database access happens at request time only.
	 */
	await connection();

	return children;
}
