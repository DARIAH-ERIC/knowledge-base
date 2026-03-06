/* eslint-disable react/jsx-no-literals */

import type { ReactNode } from "react";

import { UserMenu } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/user-menu";
import { Breadcrumbs, BreadcrumbsItem } from "@dariah-eric/ui/breadcrumbs";
import { SidebarNav, SidebarTrigger } from "@dariah-eric/ui/sidebar";
import { getCurrentSession } from "@/lib/auth/session";

export async function DashboardSidebarNav(): Promise<ReactNode> {
	const { user } = await getCurrentSession();

	return (
		<SidebarNav>
			<span className="flex items-center gap-x-4">
				<SidebarTrigger />
				<Breadcrumbs className="hidden md:flex">
					<BreadcrumbsItem href="/dashboard">Dashboard</BreadcrumbsItem>
					<BreadcrumbsItem>Overview</BreadcrumbsItem>
				</Breadcrumbs>
			</span>
			{user != null ? <UserMenu user={user} /> : null}
		</SidebarNav>
	);
}
