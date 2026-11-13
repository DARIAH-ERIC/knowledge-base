"use client";

import { Button } from "@dariah-eric/ui/button";
import { ModalClose, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import { useExtracted } from "next-intl";
import {
	Fragment,
	type ReactNode,
	type RefObject,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";

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
	const isConfirmedRef = useRef(false);

	return (
		<Fragment>
			<Button
				isPending={isPending}
				onPress={() => {
					setIsOpen(true);
				}}
			>
				{label}
			</Button>
			<ModalContent isOpen={isOpen} onOpenChange={setIsOpen} role="alertdialog" size="md">
				<SubmitOnClose formId={formId} isConfirmedRef={isConfirmedRef} />
				<ModalHeader description={confirmation.description} title={confirmation.title} />
				<ModalFooter>
					<ModalClose>{t("Cancel")}</ModalClose>
					<Button
						onPress={() => {
							isConfirmedRef.current = true;
							setIsOpen(false);
						}}
					>
						{confirmation.confirmLabel}
					</Button>
				</ModalFooter>
			</ModalContent>
		</Fragment>
	);
}

interface SubmitOnCloseProps {
	formId: string;
	isConfirmedRef: RefObject<boolean>;
}

/**
 * Submits the form once the dialog has fully closed (after its exit animation), and only if it was
 * confirmed. Submitting from inside the open dialog left the action's redirect uncommitted, so the
 * form is submitted from the page, exactly as a plain submit button would.
 */
function SubmitOnClose(props: Readonly<SubmitOnCloseProps>): null {
	const { formId, isConfirmedRef } = props;

	useEffect(() => {
		const confirmed = isConfirmedRef;

		return () => {
			if (!confirmed.current) {
				return;
			}

			confirmed.current = false;
			const form = document.getElementById(formId);
			if (form instanceof HTMLFormElement) {
				form.requestSubmit();
			}
		};
	}, [formId, isConfirmedRef]);

	return null;
}
