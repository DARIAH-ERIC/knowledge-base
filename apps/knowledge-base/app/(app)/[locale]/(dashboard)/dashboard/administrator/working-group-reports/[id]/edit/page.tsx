import { db } from "@dariah-eric/database/client";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { WorkingGroupReportEditForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/working-group-reports/_components/working-group-report-edit-form";
import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorEditWorkingGroupReportPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorEditWorkingGroupReportPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Edit working group report"),
	});

	return metadata;
}

export default async function DashboardAdministratorEditWorkingGroupReportPage(
	props: Readonly<DashboardAdministratorEditWorkingGroupReportPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const report = await db.query.workingGroupReports.findFirst({
		where: { id },
		columns: { id: true, status: true },
		with: {
			campaign: { columns: { year: true } },
			workingGroup: { columns: { name: true } },
		},
	});

	if (report == null) {
		notFound();
	}

	return <WorkingGroupReportEditForm report={report} />;
}
