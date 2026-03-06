import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

import { DashboardSidebar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/dashboard-sidebar";
import { DashboardSidebarNav } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/dashboard-sidebar-nav";
import { mainContentId } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/main";
import { SkipLink } from "@/components/skip-link";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface DashbardLayoutProps extends LayoutProps<"/[locale]/dashboard"> {}

export default async function DashbardLayout(
	props: Readonly<DashbardLayoutProps>,
): Promise<ReactNode> {
	const { children } = props;

	const t = await getTranslations("DashboardLayout");

	/**
	 * We cannot access the database when building the app in github actions,
	 * so we need to ensure that all database access happens at request time only.
	 */
	await connection();

	return (
		<Fragment>
			<SkipLink href={`#${mainContentId}`}>{t("skip-link")}</SkipLink>

			<div className="relative isolate flex h-full flex-col">
				<SidebarProvider>
					<DashboardSidebar intent="float" />

					<SidebarInset>
						<DashboardSidebarNav />
						<div className="p-4 lg:p-6">{children}</div>
					</SidebarInset>
				</SidebarProvider>
			</div>
		</Fragment>
	);
}
