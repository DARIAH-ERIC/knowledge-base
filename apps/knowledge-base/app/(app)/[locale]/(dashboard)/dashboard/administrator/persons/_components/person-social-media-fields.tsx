"use client";

import { personSocialMediaTypesEnum } from "@dariah-eric/database/schema";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { TextField } from "@dariah-eric/ui/text-field";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { type ReactNode, useState } from "react";

import { FormSection } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { PersonSocialMediaEntry } from "@/lib/data/person-social-media";
import { getSocialMediaTypeLabel } from "@/lib/social-media-type-label";

/**
 * Rows hold their values in the DOM, not in state: each row keeps a stable client-side key, so
 * reordering moves the existing inputs rather than remounting them, and what the user typed travels
 * with the row. State therefore only tracks which rows exist and in what order.
 */
interface EntryRow extends Partial<PersonSocialMediaEntry> {
	key: string;
}

interface PersonSocialMediaFieldsProps {
	initialSocialMedia?: Array<PersonSocialMediaEntry>;
}

/**
 * Editor for a person's own social media. Unlike the shared social media picker there is nothing to
 * search for and nothing to reuse — these rows belong to the person alone, so each is typed in
 * here. Row order becomes `person_social_media.position`.
 */
export function PersonSocialMediaFields(props: Readonly<PersonSocialMediaFieldsProps>): ReactNode {
	const { initialSocialMedia } = props;

	const t = useExtracted();

	const [rows, setRows] = useState<Array<EntryRow>>(() =>
		(initialSocialMedia ?? []).map((entry, index) => {
			return { ...entry, key: `initial-${String(index)}` };
		}),
	);
	const [nextKey, setNextKey] = useState(0);

	function moveRow(key: string, direction: "up" | "down") {
		setRows((prev) => {
			const index = prev.findIndex((row) => row.key === key);
			const target = direction === "up" ? index - 1 : index + 1;
			if (index === -1 || target < 0 || target >= prev.length) {
				return prev;
			}
			const next = [...prev];
			const [row] = next.splice(index, 1);
			next.splice(target, 0, row!);
			return next;
		});
	}

	return (
		<FormSection
			description={t("Add the person's own website and social media profiles.")}
			title={t("Social media")}
			variant="stacked"
		>
			{rows.length === 0 ? (
				<p className="text-sm text-muted-fg">{t("No social media added")}</p>
			) : (
				<ul className="flex flex-col gap-y-4">
					{rows.map((row, index) => (
						<li key={row.key} className="flex items-end gap-x-2">
							{/* `defaultSelectedKey` is flagged deprecated, but the plural form is typed for
							    `selectionMode="multiple"` only, so it is still the single-select API here. */}
							<Select
								className="shrink-0 inline-40"
								defaultSelectedKey={row.type ?? "website"}
								isRequired={true}
								name={`socialMedia.${String(index)}.type`}
							>
								<Label>{t("Type")}</Label>
								<SelectTrigger />
								<FieldError />
								<SelectContent>
									{personSocialMediaTypesEnum.map((type) => (
										<SelectItem key={type} id={type}>
											{getSocialMediaTypeLabel(type)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<TextField
								className="flex-1"
								defaultValue={row.url}
								isRequired={true}
								name={`socialMedia.${String(index)}.url`}
							>
								<Label>{t("URL")}</Label>
								<Input placeholder="https://" />
								<FieldError />
							</TextField>

							<TextField
								className="flex-1"
								defaultValue={row.label ?? undefined}
								name={`socialMedia.${String(index)}.label`}
							>
								<Label>{t("Label (optional)")}</Label>
								<Input />
								<FieldError />
							</TextField>

							<div className="flex shrink-0 items-center gap-x-1 pbe-1">
								<Button
									aria-label={t("Move up")}
									intent="plain"
									isDisabled={index === 0}
									onPress={() => {
										moveRow(row.key, "up");
									}}
									size="sq-sm"
								>
									<ChevronUpIcon className="block-4 inline-4" />
								</Button>
								<Button
									aria-label={t("Move down")}
									intent="plain"
									isDisabled={index === rows.length - 1}
									onPress={() => {
										moveRow(row.key, "down");
									}}
									size="sq-sm"
								>
									<ChevronDownIcon className="block-4 inline-4" />
								</Button>
								<Button
									aria-label={t("Remove entry")}
									intent="plain"
									onPress={() => {
										setRows((prev) => prev.filter((entry) => entry.key !== row.key));
									}}
									size="sq-sm"
								>
									<TrashIcon className="block-4 inline-4" />
								</Button>
							</div>
						</li>
					))}
				</ul>
			)}

			<Button
				className="self-start"
				intent="outline"
				onPress={() => {
					setRows((prev) => [...prev, { key: `new-${String(nextKey)}` }]);
					setNextKey((prev) => prev + 1);
				}}
			>
				<PlusIcon />
				{t("Add entry")}
			</Button>
		</FormSection>
	);
}
