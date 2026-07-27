"use client";

import { AsyncSelect } from "@dariah-eric/ui/async-select";
import { Button } from "@dariah-eric/ui/button";
import { ModalBody, ModalContent, ModalFooter, ModalHeader } from "@dariah-eric/ui/modal";
import { useExtracted } from "next-intl";
import { type ComponentType, type ReactNode, useState } from "react";

import {
	type EntityOption,
	fetchEntityOptionsPage,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/entity-option";
import { renderEntityOption } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/maintenance/_components/entity-option-item";

interface EntityLinkDialogProps {
	/** Receives the entity's document id and its label, to use as the link text. */
	onSelect: (entityId: string, label: string) => void;
	trigger: ComponentType<{ open: () => void }>;
}

/**
 * Picks an entity for a rich-text link to point at.
 *
 * Backed by `/api/relations/entities`, the same published-only endpoint the relation pickers use —
 * "what may this link to" is the same question as "what may this relate to", and an editor should
 * not be able to link readers at an unpublished draft.
 *
 * What is stored is the document id, never the slug or a path: the API resolves it to the entity's
 * current url at read time, so renaming a slug moves every link that points at it.
 */
export function EntityLinkDialog({
	onSelect,
	trigger: Trigger,
}: Readonly<EntityLinkDialogProps>): ReactNode {
	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);
	const [selected, setSelected] = useState<EntityOption | null>(null);

	function close() {
		setIsOpen(false);
		setSelected(null);
	}

	return (
		<>
			<Trigger
				open={() => {
					setIsOpen(true);
				}}
			/>
			<ModalContent isOpen={isOpen} onOpenChange={setIsOpen} size="lg">
				<ModalHeader
					description={t("The link keeps working if the page is later renamed.")}
					title={t("Link to a page")}
				/>
				<ModalBody>
					<AsyncSelect<EntityOption>
						aria-label={t("Page to link to")}
						fetchPage={fetchEntityOptionsPage}
						initialItems={[]}
						initialTotal={0}
						label={t("Page to link to")}
						loadOnMount={true}
						onSelect={setSelected}
						placeholder={t("Search for a page…")}
						renderItem={renderEntityOption}
						selectedItem={selected}
					/>
				</ModalBody>
				<ModalFooter>
					<Button intent="outline" onPress={close} type="button">
						{t("Cancel")}
					</Button>
					<Button
						intent="primary"
						isDisabled={selected == null}
						onPress={() => {
							if (selected == null) {
								return;
							}
							onSelect(selected.id, selected.name);
							close();
						}}
						type="button"
					>
						{t("Link")}
					</Button>
				</ModalFooter>
			</ModalContent>
		</>
	);
}
