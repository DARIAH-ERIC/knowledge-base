"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { Button } from "@dariah-eric/ui/button";
import { buttonStyles } from "@dariah-eric/ui/button-styles";
import { Link } from "@dariah-eric/ui/link";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { queue } from "@dariah-eric/ui/toast";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { type ReactNode, useState, useTransition } from "react";

import { ActionErrorAlert } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/action-error-alert";
import { runAction } from "@/lib/run-action";

/** Lifecycle command actions return an ActionState on completion; the bar shows its error, if any. */
type LifecycleAction = (documentId: string) => Promise<unknown>;

interface EntityLifecycleBarProps {
	documentId: string;
	isPublished: boolean;
	hasDraft: boolean;
	editHref?: string;
	publishAction?: LifecycleAction;
	discardDraftAction?: LifecycleAction;
}

export function EntityLifecycleBar(props: Readonly<EntityLifecycleBarProps>): ReactNode {
	const { documentId, isPublished, hasDraft, editHref, publishAction, discardDraftAction } = props;

	const t = useExtracted();
	const [isPublishing, startPublishTransition] = useTransition();
	const [isDiscarding, startDiscardTransition] = useTransition();
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);
	const [discardError, setDiscardError] = useState<string | null>(null);

	let badgeIntent: "success" | "info" | "warning";
	let badgeLabel: string;

	if (isPublished && hasDraft) {
		badgeIntent = "info";
		badgeLabel = t("Published with draft changes");
	} else if (isPublished && !hasDraft) {
		badgeIntent = "success";
		badgeLabel = t("Published");
	} else {
		badgeIntent = "warning";
		badgeLabel = t("Draft");
	}

	return (
		<div className="flex items-center gap-x-3">
			<Badge intent={badgeIntent} isCircle={false}>
				{badgeLabel}
			</Badge>

			{editHref != null ? (
				<Link className={buttonStyles({ intent: "secondary", size: "sm" })} href={editHref}>
					<PencilSquareIcon data-slot="icon" />
					{t("Edit")}
				</Link>
			) : null}

			{hasDraft && publishAction != null ? (
				<Button
					intent="primary"
					isPending={isPublishing}
					onPress={() => {
						startPublishTransition(async () => {
							const error = await runAction(
								() => publishAction(documentId),
								t("Could not publish the draft. Please try again."),
							);
							if (error != null) {
								queue.add({ title: error }, { timeout: 5000 });
							}
						});
					}}
					size="sm"
				>
					{t("Publish saved draft")}
				</Button>
			) : null}

			{hasDraft && isPublished && discardDraftAction != null ? (
				<>
					<Button
						intent="plain"
						isPending={isDiscarding}
						onPress={() => {
							setDiscardError(null);
							setIsConfirmOpen(true);
						}}
						size="sm"
					>
						{t("Discard draft")}
					</Button>

					<ModalContent
						isOpen={isConfirmOpen}
						onOpenChange={(open) => {
							if (!isDiscarding) {
								setIsConfirmOpen(open);
							}
						}}
					>
						<ModalHeader
							description={t("Discard unpublished changes? The published version will remain.")}
							title={t("Discard draft")}
						/>
						{discardError != null ? (
							<ModalBody>
								<ActionErrorAlert message={discardError} />
							</ModalBody>
						) : null}
						<ModalFooter>
							<ModalClose isDisabled={isDiscarding}>{t("Cancel")}</ModalClose>
							<Button
								intent="warning"
								isPending={isDiscarding}
								onPress={() => {
									setDiscardError(null);
									startDiscardTransition(async () => {
										const error = await runAction(
											() => discardDraftAction(documentId),
											t("Could not discard the draft. Please try again."),
										);
										if (error != null) {
											setDiscardError(error);
											return;
										}
										setIsConfirmOpen(false);
									});
								}}
							>
								{t("Discard")}
							</Button>
						</ModalFooter>
					</ModalContent>
				</>
			) : null}
		</div>
	);
}
