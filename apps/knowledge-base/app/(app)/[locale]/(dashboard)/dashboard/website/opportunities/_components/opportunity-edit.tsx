"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { EntityLifecycleBar } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/entity-lifecycle-bar";
import { OpportunityForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-form";
import { discardOpportunityDraftAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/discard-opportunity-draft.action";
import { publishOpportunityAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/publish-opportunity.action";
import { updateOpportunityAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/update-opportunity.action";

interface OpportunityEditFormProps {
	contentBlocks: Array<ContentBlock>;
	documentId: string;
	hasDraftChanges: boolean;
	isPublished: boolean;
	opportunity: Pick<
		schema.Opportunity,
		"id" | "duration" | "sourceId" | "title" | "summary" | "website"
	> & {
		entityVersion: {
			entity: Pick<schema.Entity, "id" | "slug">;
			status: Pick<schema.EntityStatus, "id" | "type">;
		};
		source: Pick<schema.OpportunitySource, "id" | "source">;
	};
	sources: Array<Pick<schema.OpportunitySource, "id" | "source">>;
}

export function OpportunityEditForm(props: Readonly<OpportunityEditFormProps>): ReactNode {
	const { contentBlocks, documentId, hasDraftChanges, isPublished, opportunity, sources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<div className="flex items-center justify-between">
				<Heading>{t("Edit opportunity")}</Heading>
				<EntityLifecycleBar
					discardDraftAction={discardOpportunityDraftAction}
					documentId={documentId}
					hasDraft={hasDraftChanges}
					isPublished={isPublished}
					publishAction={publishOpportunityAction}
				/>
			</div>

			<OpportunityForm
				contentBlocks={contentBlocks}
				formAction={updateOpportunityAction}
				opportunity={opportunity}
				sources={sources}
			/>
		</Fragment>
	);
}
