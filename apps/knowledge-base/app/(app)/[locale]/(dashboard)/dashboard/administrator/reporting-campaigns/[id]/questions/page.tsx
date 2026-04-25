import { db } from "@dariah-eric/database/client";
import type { JSONContent } from "@tiptap/core";
import { StarterKit } from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { createMetadata } from "@/lib/server/create-metadata";

interface DashboardAdministratorReportingCampaignQuestionsPageProps {
	params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata(
	_props: Readonly<DashboardAdministratorReportingCampaignQuestionsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	return createMetadata(resolvingMetadata, {
		title: t("Administrator dashboard - Campaign questions"),
	});
}

export default async function DashboardAdministratorReportingCampaignQuestionsPage(
	props: Readonly<DashboardAdministratorReportingCampaignQuestionsPageProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { id } = await params;

	const campaign = await db.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { id: true, year: true },
		with: {
			workingGroupReportQuestions: {
				columns: { id: true, question: true, position: true },
				orderBy: { position: "asc" },
			},
		},
	});

	if (campaign == null) {
		notFound();
	}

	const t = await getExtracted();

	return (
		<div className="flex flex-col gap-y-8">
			<div className="space-y-1">
				<h1 className="text-lg font-semibold text-fg">
					{t("Questions")} {"—"} {campaign.year}
				</h1>
			</div>

			{campaign.workingGroupReportQuestions.length === 0 ? (
				<p className="text-sm text-muted-fg">{t("No questions yet.")}</p>
			) : (
				<ol className="flex flex-col gap-y-4">
					{campaign.workingGroupReportQuestions.map((q) => {
						return (
							<li key={q.id} className="rounded-md border border-border p-4">
								<span className="text-xs text-muted-fg">
									{t("Question")} {q.position}
								</span>
								<div className="richtext richtext-sm mt-2">
									{renderToReactElement({
										content: q.question as JSONContent,
										extensions: [StarterKit],
									})}
								</div>
							</li>
						);
					})}
				</ol>
			)}

			<div className="rounded-md border border-dashed border-border p-6 text-center">
				<p className="text-sm text-muted-fg">
					{t("Question management (add, edit, delete) coming soon.")}
				</p>
			</div>
		</div>
	);
}
