import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { DashboardFooter } from "@/app/(app)/[locale]/(dashboard)/_components/dashboard-footer";
import { DashboardHeader } from "@/app/(app)/[locale]/(dashboard)/_components/dashboard-header";
import { Main } from "@/components/main";
import { SkipLink } from "@/components/skip-link";

const mainContentId = "main-content";

interface DashbardLayoutProps extends LayoutProps<"/[locale]"> {}

export default function DashbardLayout(props: Readonly<DashbardLayoutProps>): ReactNode {
	const { children } = props;

	const t = useTranslations("DashboardLayout");

	return (
		<Fragment>
			<SkipLink href={`#${mainContentId}`}>{t("skip-link")}</SkipLink>

			<div className="relative isolate flex h-full flex-col">
				<DashboardHeader />

				<Main className="flex-1" id={mainContentId}>
					{children}
				</Main>

				<DashboardFooter />
			</div>
		</Fragment>
	);
}
