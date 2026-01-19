import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { DashboardSidebar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/dashboard-sidebar";
import { DashboardSidebarNav } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/dashboard-sidebar-nav";
import { mainContentId } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/main";
import { SkipLink } from "@/components/skip-link";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface DashbardLayoutProps extends LayoutProps<"/[locale]/dashboard"> {}

export default function DashbardLayout(props: Readonly<DashbardLayoutProps>): ReactNode {
	const { children } = props;

	const t = useTranslations("DashboardLayout");

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
