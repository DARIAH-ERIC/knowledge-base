"use client";

import { Button } from "@dariah-eric/ui/button";
import type { ComponentProps, ReactNode } from "react";

import { ActionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-form";
import type { ServerAction } from "@/lib/server/create-server-action";

interface CampaignStatusActionFormProps {
	action: ServerAction;
	campaignId: string;
	intent?: ComponentProps<typeof Button>["intent"];
	label: string;
}

/** Keeps the render function on the client side of the Server Component boundary. */
export function CampaignStatusActionForm(
	props: Readonly<CampaignStatusActionFormProps>,
): ReactNode {
	const { action, campaignId, intent, label } = props;

	return (
		<ActionForm action={action}>
			{(isPending) => (
				<>
					<input name="id" type="hidden" value={campaignId} />
					<Button intent={intent} isPending={isPending} type="submit">
						{label}
					</Button>
				</>
			)}
		</ActionForm>
	);
}
