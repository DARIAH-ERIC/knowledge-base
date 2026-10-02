"use client";

import { Button } from "@dariah-eric/ui/button";
import type { ReactNode } from "react";

import { ActionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-form";
import type { ServerAction } from "@/lib/server/create-server-action";

interface ReportActionFormProps {
	action: ServerAction;
	label: string;
	reportId: string;
}

/** Keeps the render function on the client side of the Server Component boundary. */
export function ReportActionForm(props: Readonly<ReportActionFormProps>): ReactNode {
	const { action, label, reportId } = props;

	return (
		<ActionForm action={action}>
			{(isPending) => (
				<>
					<input name="id" type="hidden" value={reportId} />
					<Button isPending={isPending} type="submit">
						{label}
					</Button>
				</>
			)}
		</ActionForm>
	);
}
