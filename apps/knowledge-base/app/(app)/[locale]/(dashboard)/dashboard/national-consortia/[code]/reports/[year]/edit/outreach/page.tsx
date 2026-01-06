import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";

interface DashboardNationalConsortiumReportEditStepOutreachPageProps extends PageProps<"/[locale]/dashboard/national-consortia/[code]/reports/[year]/edit/outreach"> {}

export async function generateMetadata(
	_props: Readonly<DashboardNationalConsortiumReportEditStepOutreachPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardNationalConsortiumReportEditStepOutreachPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardNationalConsortiumReportEditStepOutreachPage(
	_props: Readonly<DashboardNationalConsortiumReportEditStepOutreachPageProps>,
): ReactNode {
	const t = useTranslations("DashboardNationalConsortiumReportEditStepOutreachPage");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">{t("title")}</h1>
			</section>
		</Main>
	);
}
