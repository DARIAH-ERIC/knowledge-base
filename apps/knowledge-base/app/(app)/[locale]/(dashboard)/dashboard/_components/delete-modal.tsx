"use client";

import { Button } from "@dariah-eric/ui/button";
import { ModalClose, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

import { ActionErrorAlert } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-error-alert";

interface DeleteModalProps {
	/**
	 * When true (default), the dialog auto-closes when the Delete button is pressed. Set to false to
	 * keep the dialog open while the action runs — useful when the caller wants to render an inline
	 * error on failure.
	 */
	closeOnAction?: boolean;
	errorMessage?: string | null;
	isOpen: boolean;
	isPending?: boolean;
	model: string;
	onAction: () => void;
	onOpenChange: (isOpen: boolean) => void;
}

export function DeleteModal(props: Readonly<DeleteModalProps>): ReactNode {
	const {
		closeOnAction = true,
		errorMessage,
		isOpen,
		isPending = false,
		model,
		onAction,
		onOpenChange,
	} = props;

	const t = useExtracted();

	const title = `Delete ${model}`;
	const description = `Are you sure you want to delete this ${model}? This action cannot be undone.`;

	return (
		<ModalContent isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalHeader description={description} title={title} />
			{errorMessage != null ? (
				<div className="px-6 pbe-2">
					<ActionErrorAlert message={errorMessage} />
				</div>
			) : null}
			<ModalFooter>
				<ModalClose isDisabled={isPending}>{t("Cancel")}</ModalClose>
				<Button
					intent="danger"
					isPending={isPending}
					onPress={() => {
						onAction();
						if (closeOnAction) {
							onOpenChange(false);
						}
					}}
				>
					{t("Delete")}
				</Button>
			</ModalFooter>
		</ModalContent>
	);
}
