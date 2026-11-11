"use client";

import { Button } from "@dariah-eric/ui/button";
import { Description, FieldError, Label } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted, useFormatter } from "next-intl";
import { type ReactNode, type RefObject, useRef, useState } from "react";

/** Field values keyed by input name; missing or `undefined` means "not set". */
export type CampaignFieldValues = Partial<Record<string, string>>;

/** The latest campaign before this one, with its values keyed like this form's inputs. */
export interface PreviousCampaignValues {
	year: number;
	values: CampaignFieldValues;
}

interface CampaignAmountFieldProps {
	name: string;
	label: string;
	defaultValue: string | undefined;
	previous: PreviousCampaignValues | null;
	/** "amount" for euro lump sums, "count" for whole numbers such as visit thresholds. */
	kind?: "amount" | "count";
}

export function CampaignAmountField(props: Readonly<CampaignAmountFieldProps>): ReactNode {
	const { name, label, defaultValue, previous, kind = "amount" } = props;

	const t = useExtracted();
	const format = useFormatter();

	const previousValue = previous?.values[name];

	return (
		<TextField defaultValue={defaultValue} name={name} type="number">
			<Label>{label}</Label>
			<Input min={0} step={kind === "amount" ? "0.01" : "1"} />
			{previous != null && previousValue != null && (
				<Description>
					{t("{year}: {value}", {
						year: String(previous.year),
						value:
							kind === "amount"
								? format.number(Number(previousValue), { style: "currency", currency: "EUR" })
								: format.number(Number(previousValue)),
					})}
				</Description>
			)}
			<FieldError />
		</TextField>
	);
}

interface CopyFromPreviousCampaign {
	/** Attach to the element wrapping the inputs, so their current values can be read. */
	containerRef: RefObject<HTMLFieldSetElement | null>;
	/** Changes on every copy; key the inputs with it so they pick up the new defaults. */
	fieldsKey: number;
	defaultValues: CampaignFieldValues;
	/** Number of fields the last copy filled, or `null` before the first copy. */
	copiedCount: number | null;
	copy: () => void;
}

/**
 * Fills the empty fields with the previous campaign's values, keeping whatever was typed or saved.
 * Nothing is saved: the admin reviews the values and submits the form as usual.
 */
export function useCopyFromPreviousCampaign(
	initialValues: CampaignFieldValues,
	previous: PreviousCampaignValues | null,
): CopyFromPreviousCampaign {
	const containerRef = useRef<HTMLFieldSetElement>(null);
	const [defaultValues, setDefaultValues] = useState(initialValues);
	const [fieldsKey, setFieldsKey] = useState(0);
	const [copiedCount, setCopiedCount] = useState<number | null>(null);

	function copy(): void {
		if (previous == null) {
			return;
		}

		const next: CampaignFieldValues = {};
		let count = 0;

		for (const element of containerRef.current?.elements ?? []) {
			if (!(element instanceof HTMLInputElement) || element.name === "") {
				continue;
			}

			const previousValue = previous.values[element.name];
			if (element.value === "" && previousValue != null) {
				next[element.name] = previousValue;
				count += 1;
			} else {
				next[element.name] = element.value === "" ? undefined : element.value;
			}
		}

		setDefaultValues(next);
		setFieldsKey((key) => key + 1);
		setCopiedCount(count);
	}

	return { containerRef, fieldsKey, defaultValues, copiedCount, copy };
}

interface CopyFromPreviousCampaignButtonProps {
	previous: PreviousCampaignValues | null;
	copiedCount: number | null;
	onCopy: () => void;
}

export function CopyFromPreviousCampaignButton(
	props: Readonly<CopyFromPreviousCampaignButtonProps>,
): ReactNode {
	const { previous, copiedCount, onCopy } = props;

	const t = useExtracted();

	if (previous == null || Object.values(previous.values).every((value) => value == null)) {
		return null;
	}

	const year = String(previous.year);

	return (
		<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
			<Button intent="secondary" onPress={onCopy} size="sm">
				{t("Copy empty fields from {year}", { year })}
			</Button>
			{/* Always rendered, so screen readers announce the message when it appears. */}
			<p aria-live="polite" className="text-sm text-muted-fg">
				{copiedCount == null
					? null
					: copiedCount === 0
						? t("No empty fields to fill from {year}.", { year })
						: t("Filled {count} fields from {year}. Review them, then save.", {
								count: String(copiedCount),
								year,
							})}
			</p>
		</div>
	);
}
