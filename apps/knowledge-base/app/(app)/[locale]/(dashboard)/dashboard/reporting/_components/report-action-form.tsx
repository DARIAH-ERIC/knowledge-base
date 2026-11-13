"use client";

import { Button } from "@dariah-eric/ui/button";
import { ModalClose, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useId, useState } from "react";

import { ActionForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-form";
import type { ServerAction } from "@/lib/server/create-server-action";

export interface ReportActionConfirmation {
	title: string;
	description: string;
	confirmLabel: string;
}

interface ReportActionFormProps {
	action: ServerAction;
	label: string;
	reportId: string;
	/** When set, the button opens a confirmation dialog and only its confirm button submits. */
	confirmation?: ReportActionConfirmation;
}

/** Keeps the render function on the client side of the Server Component boundary. */
export function ReportActionForm(props: Readonly<ReportActionFormProps>): ReactNode {
	const { action, label, reportId, confirmation } = props;

	const formId = useId();

	return (
		<ActionForm action={action} id={formId}>
			{(isPending) => (
				<Fragment>
					<input name="id" type="hidden" value={reportId} />
					{confirmation == null ? (
						<Button isPending={isPending} type="submit">
							{label}
						</Button>
					) : (
						<ConfirmedSubmitButton
							confirmation={confirmation}
							formId={formId}
							isPending={isPending}
							label={label}
						/>
					)}
				</Fragment>
			)}
		</ActionForm>
	);
}

interface ConfirmedSubmitButtonProps {
	confirmation: ReportActionConfirmation;
	formId: string;
	isPending: boolean;
	label: string;
}

function ConfirmedSubmitButton(props: Readonly<ConfirmedSubmitButtonProps>): ReactNode {
	const { confirmation, formId, isPending, label } = props;

	const t = useExtracted();
	const [isOpen, setIsOpen] = useState(false);
	const [wasPending, setWasPending] = useState(isPending);

	/**
	 * Close the dialog once the submission settles. On success the page revalidates and this button
	 * goes away; on failure the error shows below the button, which the dialog would otherwise
	 * cover.
	 */
	if (isPending !== wasPending) {
		setWasPending(isPending);
		if (!isPending) {
			setIsOpen(false);
		}
	}

	return (
		<Fragment>
			<Button
				onPress={() => {
					setIsOpen(true);
				}}
			>
				{label}
			</Button>
			<ModalContent
				isOpen={isOpen}
				onOpenChange={(open) => {
					if (!open && !isPending) {
						setIsOpen(false);
					}
				}}
				role="alertdialog"
				size="md"
			>
				<ModalHeader description={confirmation.description} title={confirmation.title} />
				<ModalFooter>
					<ModalClose isDisabled={isPending}>{t("Cancel")}</ModalClose>
					{/* The dialog renders in a portal outside the form, so the button targets it by id. */}
					<Button form={formId} isPending={isPending} type="submit">
						{confirmation.confirmLabel}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}
