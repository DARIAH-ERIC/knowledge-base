import { useTranslations } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { DefaultFooter } from "@/app/(app)/[locale]/(default)/_components/default-footer";
import { DefaultHeader } from "@/app/(app)/[locale]/(default)/_components/default-header";
import { Main } from "@/components/main";
import { SkipLink } from "@/components/skip-link";

const mainContentId = "main-content";

interface DefaultLayoutProps extends LayoutProps<"/[locale]"> {}

export default function DefaultLayout(props: Readonly<DefaultLayoutProps>): ReactNode {
	const { children } = props;

	const t = useTranslations("DefaultLayout");

	return (
		<Fragment>
			<SkipLink href={`#${mainContentId}`}>{t("skip-link")}</SkipLink>

			<div className="relative isolate flex min-h-full flex-col">
				<DefaultHeader />

				<Main className="flex-1" id={mainContentId}>
					{children}
				</Main>

				<DefaultFooter />
			</div>
		</Fragment>
	);
}
