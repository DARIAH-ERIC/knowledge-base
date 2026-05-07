"use client";

import type * as schema from "@dariah-eric/database/schema";
import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import type { ContentBlock } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/content-blocks";
import { OpportunityForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_components/opportunity-form";
import { updateOpportunityAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/opportunities/_lib/update-opportunity.action";

interface OpportunityEditFormProps {
	contentBlocks: Array<ContentBlock>;
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
	const { contentBlocks, opportunity, sources } = props;

	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("Edit opportunity")}</Heading>

			<OpportunityForm
				contentBlocks={contentBlocks}
				formAction={updateOpportunityAction}
				opportunity={opportunity}
				sources={sources}
			/>
		</Fragment>
	);
}
