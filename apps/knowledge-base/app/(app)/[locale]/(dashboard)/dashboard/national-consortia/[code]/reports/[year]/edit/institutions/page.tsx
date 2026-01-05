import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";

interface DashboardNationalConsortiumReportEditStepInstitutionsPageProps extends PageProps<"/[locale]/dashboard/national-consortia/[code]/reports/[year]/edit/institutions"> {}

export async function generateMetadata(
	_props: Readonly<DashboardNationalConsortiumReportEditStepInstitutionsPageProps>,
): Promise<Metadata> {
	const t = await getTranslations("DashboardNationalConsortiumReportEditStepInstitutionsPage");

	const metadata: Metadata = {
		title: t("meta.title"),
	};

	return metadata;
}

export default function DashboardNationalConsortiumReportEditStepInstitutionsPage(
	_props: Readonly<DashboardNationalConsortiumReportEditStepInstitutionsPageProps>,
): ReactNode {
	const t = useTranslations("DashboardNationalConsortiumReportEditStepInstitutionsPage");

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex flex-col gap-y-8">
				<h1 className="text-5xl font-extrabold tracking-tight text-text-strong">{t("title")}</h1>
			</section>
		</Main>
	);
}
