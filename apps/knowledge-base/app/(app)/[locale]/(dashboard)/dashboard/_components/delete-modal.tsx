"use client";

import { Button } from "@dariah-eric/ui/button";
import { ModalClose, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface DeleteModalProps {
	model: string;
	isOpen: boolean;
	onOpenChange: (isOpen: boolean) => void;
	onAction: () => void;
}

export function DeleteModal(props: Readonly<DeleteModalProps>): ReactNode {
	const { model, onAction, onOpenChange, isOpen } = props;

	const t = useExtracted();

	const title = `Delete ${model}`;
	const description = `Are you sure you want to delete this ${model}? This action cannot be undone.`;

	return (
		<ModalContent isOpen={isOpen} onOpenChange={onOpenChange}>
			<ModalHeader description={description} title={title} />
			<ModalFooter>
				<ModalClose>{t("Cancel")}</ModalClose>
				<Button
					intent="danger"
					onPress={() => {
						onAction();
						onOpenChange(false);
					}}
				>
					{t("Delete")}
				</Button>
			</ModalFooter>
		</ModalContent>
	);
}
