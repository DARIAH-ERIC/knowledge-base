import {
	type ActionState,
	createActionStateInitial,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import { Time, parseDate } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Fragment, type ReactNode, useActionState, useState } from "react";
import type { DateValue, Key, TimeValue } from "react-aria-components";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { AsyncListSelect } from "./async-list-select";
import { AsyncMultipleSelect } from "./async-multiple-select";
import { AsyncSelect } from "./async-select";
import { Button } from "./button";
import { Checkbox, CheckboxGroup } from "./checkbox";
import { DateField, DateInput } from "./date-field";
import { DatePicker, DatePickerTrigger } from "./date-picker";
import { Label } from "./field";
import { Form } from "./form";
import { InlineRichTextEditor } from "./inline-rich-text-editor";
import { Input } from "./input";
import { MultipleSelect, MultipleSelectContent, MultipleSelectItem } from "./multiple-select";
import { NumberField, NumberInput } from "./number-field";
import { RichTextEditor } from "./rich-text-editor";
import { SearchField, SearchInput } from "./search-field";
import {
	SearchableSelect,
	SearchableSelectContent,
	SearchableSelectInput,
	SearchableSelectItem,
} from "./searchable-select";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";
import { Switch } from "./switch";
import { TextField } from "./text-field";
import { TextArea } from "./textarea";
import { TimeField } from "./time-field";
import type { AsyncOption, AsyncOptionsFetchPage } from "./use-async-options";

/**
 * Every form field, uncontrolled and controlled, in one form. The stories check what the form
 * submits after a successful action: an edit form must keep the saved values, while a form with
 * `resetOnSuccess` must be back to its initial, empty values.
 */

const options = [
	{ id: "a", name: "Alpha" },
	{ id: "b", name: "Beta" },
];

const asyncOptions: Array<AsyncOption> = options;

const fetchOptions: AsyncOptionsFetchPage<AsyncOption> = ({ limit, offset, q }) => {
	const items = asyncOptions.filter((option) =>
		option.name.toLowerCase().includes(q.toLowerCase()),
	);
	return Promise.resolve({ items: items.slice(offset, offset + limit), total: items.length });
};

type Variant = "Controlled" | "Uncontrolled";

interface FieldsProps {
	/** Whether every field starts with a value, e.g. the saved values in an edit form. */
	hasInitialValues: boolean;
}

/** The values fields start with when `hasInitialValues` is set. */
const initialValues = {
	text: "initial text",
	textarea: "initial textarea",
	number: 1,
	search: "initial search",
	checkbox: true,
	checkboxGroup: ["a"],
	switch: true,
	select: "a",
	multipleSelect: ["a"],
	searchableSelect: "a",
	dateField: parseDate("2026-01-01"),
	datePicker: parseDate("2026-01-01"),
	timeField: new Time(9),
	richText: {
		type: "doc",
		content: [{ type: "paragraph", content: [{ type: "text", text: "initial" }] }],
	},
	asyncSelect: asyncOptions[0]!,
	asyncMultipleSelect: ["a"],
	asyncListSelect: ["a"],
};

function UncontrolledFields(props: Readonly<FieldsProps>): ReactNode {
	const { hasInitialValues } = props;

	const variant: Variant = "Uncontrolled";
	const initial = hasInitialValues ? initialValues : null;

	return (
		<Fragment>
			<TextField defaultValue={initial?.text} name={`${variant}.text`}>
				<Label>{`${variant} text`}</Label>
				<Input />
			</TextField>

			<TextField defaultValue={initial?.textarea} name={`${variant}.textarea`}>
				<Label>{`${variant} textarea`}</Label>
				<TextArea />
			</TextField>

			<NumberField defaultValue={initial?.number} name={`${variant}.number`}>
				<Label>{`${variant} number`}</Label>
				<NumberInput />
			</NumberField>

			<SearchField defaultValue={initial?.search} name={`${variant}.search`}>
				<Label>{`${variant} search`}</Label>
				<SearchInput />
			</SearchField>

			<Checkbox defaultSelected={initial?.checkbox} name={`${variant}.checkbox`}>
				{`${variant} checkbox`}
			</Checkbox>

			<CheckboxGroup defaultValue={initial?.checkboxGroup} name={`${variant}.checkboxGroup`}>
				<Label>{`${variant} checkbox group`}</Label>
				{options.map((option) => (
					<Checkbox key={option.id} value={option.id}>{`${variant} ${option.name}`}</Checkbox>
				))}
			</CheckboxGroup>

			<Switch defaultSelected={initial?.switch} name={`${variant}.switch`}>
				{`${variant} switch`}
			</Switch>

			<Select defaultValue={initial?.select} name={`${variant}.select`}>
				<Label>{`${variant} select`}</Label>
				<SelectTrigger />
				<SelectContent items={options}>
					{(option) => <SelectItem id={option.id}>{option.name}</SelectItem>}
				</SelectContent>
			</Select>

			<MultipleSelect defaultValue={initial?.multipleSelect} name={`${variant}.multipleSelect`}>
				<Label>{`${variant} multiple select`}</Label>
				<MultipleSelectContent items={options}>
					{(option) => <MultipleSelectItem id={option.id}>{option.name}</MultipleSelectItem>}
				</MultipleSelectContent>
			</MultipleSelect>

			<SearchableSelect
				defaultValue={initial?.searchableSelect}
				name={`${variant}.searchableSelect`}
			>
				<Label>{`${variant} searchable select`}</Label>
				<SearchableSelectInput />
				<SearchableSelectContent items={options}>
					{(option) => (
						<SearchableSelectItem id={option.id} textValue={option.name}>
							{option.name}
						</SearchableSelectItem>
					)}
				</SearchableSelectContent>
			</SearchableSelect>

			<DateField defaultValue={initial?.dateField} name={`${variant}.dateField`}>
				<Label>{`${variant} date field`}</Label>
				<DateInput />
			</DateField>

			<DatePicker
				defaultValue={initial?.datePicker}
				granularity="day"
				name={`${variant}.datePicker`}
			>
				<Label>{`${variant} date picker`}</Label>
				<DatePickerTrigger />
			</DatePicker>

			<TimeField defaultValue={initial?.timeField} name={`${variant}.timeField`}>
				<Label>{`${variant} time field`}</Label>
				<DateInput />
			</TimeField>

			<RichTextEditor
				aria-label={`${variant} rich text`}
				content={initial?.richText}
				name={`${variant}.richText`}
			/>

			<InlineRichTextEditor
				aria-label={`${variant} inline rich text`}
				content={initial?.richText}
				name={`${variant}.inlineRichText`}
			/>
		</Fragment>
	);
}

function ControlledFields(props: Readonly<FieldsProps>): ReactNode {
	const { hasInitialValues } = props;

	const variant: Variant = "Controlled";
	const initial = hasInitialValues ? initialValues : null;

	const [text, setText] = useState(initial?.text ?? "");
	const [textarea, setTextarea] = useState(initial?.textarea ?? "");
	const [number, setNumber] = useState(initial?.number ?? Number.NaN);
	const [search, setSearch] = useState(initial?.search ?? "");
	const [checkbox, setCheckbox] = useState(initial?.checkbox ?? false);
	const [checkboxGroup, setCheckboxGroup] = useState<Array<string>>(initial?.checkboxGroup ?? []);
	const [switchValue, setSwitchValue] = useState(initial?.switch ?? false);
	const [select, setSelect] = useState<Key | null>(initial?.select ?? null);
	const [multipleSelect, setMultipleSelect] = useState<Array<Key>>(initial?.multipleSelect ?? []);
	const [searchableSelect, setSearchableSelect] = useState<Key | null>(
		initial?.searchableSelect ?? null,
	);
	const [dateField, setDateField] = useState<DateValue | null>(initial?.dateField ?? null);
	const [datePicker, setDatePicker] = useState<DateValue | null>(initial?.datePicker ?? null);
	const [timeField, setTimeField] = useState<TimeValue | null>(initial?.timeField ?? null);
	const [asyncSelect, setAsyncSelect] = useState<AsyncOption | null>(initial?.asyncSelect ?? null);
	const [asyncMultipleSelect, setAsyncMultipleSelect] = useState<Array<string>>(
		initial?.asyncMultipleSelect ?? [],
	);
	const [asyncListSelect, setAsyncListSelect] = useState<Array<string>>(
		initial?.asyncListSelect ?? [],
	);

	return (
		<Fragment>
			<TextField name={`${variant}.text`} onChange={setText} value={text}>
				<Label>{`${variant} text`}</Label>
				<Input />
			</TextField>

			<TextField name={`${variant}.textarea`} onChange={setTextarea} value={textarea}>
				<Label>{`${variant} textarea`}</Label>
				<TextArea />
			</TextField>

			<NumberField name={`${variant}.number`} onChange={setNumber} value={number}>
				<Label>{`${variant} number`}</Label>
				<NumberInput />
			</NumberField>

			<SearchField name={`${variant}.search`} onChange={setSearch} value={search}>
				<Label>{`${variant} search`}</Label>
				<SearchInput />
			</SearchField>

			<Checkbox isSelected={checkbox} name={`${variant}.checkbox`} onChange={setCheckbox}>
				{`${variant} checkbox`}
			</Checkbox>

			<CheckboxGroup
				name={`${variant}.checkboxGroup`}
				onChange={setCheckboxGroup}
				value={checkboxGroup}
			>
				<Label>{`${variant} checkbox group`}</Label>
				{options.map((option) => (
					<Checkbox key={option.id} value={option.id}>{`${variant} ${option.name}`}</Checkbox>
				))}
			</CheckboxGroup>

			<Switch isSelected={switchValue} name={`${variant}.switch`} onChange={setSwitchValue}>
				{`${variant} switch`}
			</Switch>

			<Select name={`${variant}.select`} onChange={setSelect} value={select}>
				<Label>{`${variant} select`}</Label>
				<SelectTrigger />
				<SelectContent items={options}>
					{(option) => <SelectItem id={option.id}>{option.name}</SelectItem>}
				</SelectContent>
			</Select>

			<MultipleSelect
				name={`${variant}.multipleSelect`}
				onChange={setMultipleSelect}
				value={multipleSelect}
			>
				<Label>{`${variant} multiple select`}</Label>
				<MultipleSelectContent items={options}>
					{(option) => <MultipleSelectItem id={option.id}>{option.name}</MultipleSelectItem>}
				</MultipleSelectContent>
			</MultipleSelect>

			<SearchableSelect
				name={`${variant}.searchableSelect`}
				onChange={setSearchableSelect}
				value={searchableSelect}
			>
				<Label>{`${variant} searchable select`}</Label>
				<SearchableSelectInput />
				<SearchableSelectContent items={options}>
					{(option) => (
						<SearchableSelectItem id={option.id} textValue={option.name}>
							{option.name}
						</SearchableSelectItem>
					)}
				</SearchableSelectContent>
			</SearchableSelect>

			<DateField name={`${variant}.dateField`} onChange={setDateField} value={dateField}>
				<Label>{`${variant} date field`}</Label>
				<DateInput />
			</DateField>

			<DatePicker
				granularity="day"
				name={`${variant}.datePicker`}
				onChange={setDatePicker}
				value={datePicker}
			>
				<Label>{`${variant} date picker`}</Label>
				<DatePickerTrigger />
			</DatePicker>

			<TimeField name={`${variant}.timeField`} onChange={setTimeField} value={timeField}>
				<Label>{`${variant} time field`}</Label>
				<DateInput />
			</TimeField>

			<AsyncSelect
				aria-label={`${variant} async select`}
				fetchPage={fetchOptions}
				initialItems={asyncOptions}
				initialTotal={asyncOptions.length}
				label={`${variant} async select`}
				onClear={() => {
					setAsyncSelect(null);
				}}
				onSelect={setAsyncSelect}
				placeholder={`${variant} async select placeholder`}
				selectedItem={asyncSelect}
			/>
			<input name={`${variant}.asyncSelect`} type="hidden" value={asyncSelect?.id ?? ""} />

			<AsyncMultipleSelect
				aria-label={`${variant} async multiple select`}
				fetchPage={fetchOptions}
				initialItems={asyncOptions}
				initialTotal={asyncOptions.length}
				label={`${variant} async multiple select`}
				onChange={setAsyncMultipleSelect}
				selectedItems={asyncOptions}
				value={asyncMultipleSelect}
			/>
			{asyncMultipleSelect.map((id) => (
				<input key={id} name={`${variant}.asyncMultipleSelect`} type="hidden" value={id} />
			))}

			<AsyncListSelect
				addLabel={`${variant} async list select add`}
				aria-label={`${variant} async list select`}
				fetchPage={fetchOptions}
				initialItems={asyncOptions}
				initialTotal={asyncOptions.length}
				label={`${variant} async list select`}
				onChange={setAsyncListSelect}
				selectedItems={asyncOptions}
				value={asyncListSelect}
			/>
			{asyncListSelect.map((id) => (
				<input key={id} name={`${variant}.asyncListSelect`} type="hidden" value={id} />
			))}
		</Fragment>
	);
}

function Fields(props: Readonly<FieldsProps & { variant: Variant }>): ReactNode {
	const { hasInitialValues, variant } = props;

	return variant === "Controlled" ? (
		<ControlledFields hasInitialValues={hasInitialValues} />
	) : (
		<UncontrolledFields hasInitialValues={hasInitialValues} />
	);
}

/** The submitted values by field name, for comparing submissions. */
type Submission = Record<string, Array<string>>;

function toSubmission(formData: FormData): Submission {
	const submission: Submission = {};
	for (const [name, value] of formData) {
		if (typeof value === "string") {
			(submission[name] ??= []).push(value);
		}
	}
	return submission;
}

interface FormFieldsHarnessProps {
	hasInitialValues?: boolean;
	resetOnSuccess?: boolean;
}

function FormFieldsHarness(props: Readonly<FormFieldsHarnessProps>): ReactNode {
	const { hasInitialValues = false, resetOnSuccess } = props;

	const [state, action] = useActionState(
		(_state: ActionState, formData: FormData): ActionState =>
			createActionStateSuccess({ formData, message: "Saved." }),
		createActionStateInitial(),
	);

	return (
		<Form
			action={action}
			className="grid grid-cols-2 gap-x-8 gap-y-4 inline-200"
			resetOnSuccess={resetOnSuccess}
			state={state}
		>
			<div className="flex flex-col gap-y-4">
				<Fields hasInitialValues={hasInitialValues} variant="Uncontrolled" />
			</div>
			<div className="flex flex-col gap-y-4">
				<Fields hasInitialValues={hasInitialValues} variant="Controlled" />
			</div>
			<div className="col-span-2 flex items-center gap-x-4">
				<Button type="submit">{"Submit"}</Button>
				<output data-state-id={state.id} data-testid="submission">
					{state.formData != null ? JSON.stringify(toSubmission(state.formData)) : ""}
				</output>
			</div>
		</Form>
	);
}

const meta = {
	title: "Components/Form/Fields",
	component: FormFieldsHarness,
	parameters: {
		layout: "padded",
	},
	args: {},
} satisfies Meta<typeof FormFieldsHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

/** Options and popovers are rendered outside the canvas. */
const screen = within(document.body);

async function submit(canvas: Canvas): Promise<Submission> {
	const output = canvas.getByTestId("submission");
	const previousId = output.dataset.stateId;
	const button = canvas.getByRole("button", { name: "Submit" });
	await userEvent.click(button);
	/** The hovered button's colours fail the a11y check run after the story, which is not under test. */
	await userEvent.unhover(button);
	/** Two submissions may send the same values, so the action state's id tells them apart. */
	await waitFor(async () => {
		await expect(output.dataset.stateId).not.toBe(previousId);
	});
	return JSON.parse(output.textContent) as Submission;
}

async function typeSegments(canvas: Canvas, label: string, keys: string): Promise<void> {
	const [firstSegment] = within(canvas.getByRole("group", { name: label })).getAllByRole(
		"spinbutton",
	);
	await userEvent.click(firstSegment!);
	await userEvent.keyboard(keys);
}

async function pickOption(name: string): Promise<void> {
	await userEvent.click(await screen.findByRole("option", { name }));
}

/**
 * A select's trigger, which react-aria names by the field's label and its value. Found by the
 * label's id, since one label can be part of another, e.g. "Controlled select" of "Uncontrolled
 * select".
 */
function trigger(canvas: Canvas, label: string): HTMLElement {
	const { id } = canvas.getByText(label, { exact: true });
	const button = canvas
		.getAllByRole("button")
		.find((element) => element.getAttribute("aria-labelledby")?.split(" ").includes(id) === true);
	if (button == null) {
		throw new Error(`No trigger for "${label}".`);
	}
	return button;
}

/** Replaces a text input's value. */
async function retype(input: HTMLElement, text: string): Promise<void> {
	await userEvent.clear(input);
	await userEvent.type(input, text);
}

/** Changes every field of a variant, whether it starts empty or with its initial value. */
async function changeFields(
	canvas: Canvas,
	variant: Variant,
	hasInitialValues: boolean,
): Promise<void> {
	await retype(canvas.getByLabelText(`${variant} text`), "text");
	await retype(canvas.getByLabelText(`${variant} textarea`), "textarea");
	await retype(canvas.getByLabelText(`${variant} number`, { selector: "input" }), "5");
	await retype(canvas.getByLabelText(`${variant} search`, { selector: "input" }), "search");
	await userEvent.click(canvas.getByRole("checkbox", { name: `${variant} checkbox` }));
	await userEvent.click(canvas.getByRole("checkbox", { name: `${variant} Beta` }));
	await userEvent.click(canvas.getByRole("switch", { name: `${variant} switch` }));

	await userEvent.click(trigger(canvas, `${variant} select`));
	await pickOption("Beta");

	await userEvent.click(trigger(canvas, `${variant} multiple select`));
	await pickOption("Beta");
	await userEvent.keyboard("{Escape}");

	await retype(canvas.getByRole("combobox", { name: `${variant} searchable select` }), "Be");
	await pickOption("Beta");

	/** Day equals month, whatever the locale's order of segments. */
	await typeSegments(canvas, `${variant} date field`, "02022026");
	await typeSegments(canvas, `${variant} date picker`, "03032026");
	await typeSegments(canvas, `${variant} time field`, "1030");

	if (variant === "Uncontrolled") {
		await userEvent.click(canvas.getByRole("textbox", { name: `${variant} rich text` }));
		await userEvent.keyboard("rich text");
		await userEvent.click(canvas.getByRole("textbox", { name: `${variant} inline rich text` }));
		await userEvent.keyboard("inline rich text");
		return;
	}

	/** The trigger shows the selected item, or the placeholder. */
	await userEvent.click(
		canvas.getByRole("button", {
			name: hasInitialValues ? "Alpha" : `${variant} async select placeholder`,
		}),
	);
	await pickOption("Beta");

	await userEvent.click(canvas.getByRole("button", { name: "Open options" }));
	await pickOption("Beta");
	await userEvent.keyboard("{Escape}");

	await userEvent.click(canvas.getByRole("button", { name: `${variant} async list select add` }));
	await pickOption("Beta");
	await userEvent.keyboard("{Escape}");
}

/** The fields' names, also those which submit nothing while empty. */
function fieldNames(...submissions: Array<Submission>): Array<string> {
	return [...new Set(submissions.flatMap((submission) => Object.keys(submission)))].toSorted();
}

/** Every field's submitted values, `null` for nothing, so that a diff lists all mismatching fields. */
function byField(
	names: Array<string>,
	submission: Submission,
): Record<string, Array<string> | null> {
	return Object.fromEntries(names.map((name) => [name, submission[name] ?? null]));
}

/**
 * Submits the untouched form, then the changed form, then the form once more. Returns what each
 * submission sent.
 */
async function submitChangedForm(
	canvas: Canvas,
	hasInitialValues: boolean,
): Promise<{ initial: Submission; changed: Submission; after: Submission }> {
	const initial = await submit(canvas);

	await changeFields(canvas, "Uncontrolled", hasInitialValues);
	await changeFields(canvas, "Controlled", hasInitialValues);

	const changed = await submit(canvas);

	/** Every field was changed, so a field which keeps or loses its value is noticed. */
	for (const name of fieldNames(initial, changed)) {
		await expect(changed[name], name).not.toStrictEqual(initial[name]);
	}

	const after = await submit(canvas);

	return { initial, changed, after };
}

async function expectKeepsValues(canvas: Canvas, hasInitialValues: boolean): Promise<void> {
	const { changed, after } = await submitChangedForm(canvas, hasInitialValues);

	const names = fieldNames(changed, after);
	await expect(byField(names, after)).toStrictEqual(byField(names, changed));
}

async function expectResetsValues(canvas: Canvas, hasInitialValues: boolean): Promise<void> {
	const { initial, after } = await submitChangedForm(canvas, hasInitialValues);

	const names = fieldNames(initial, after);
	await expect(byField(names, after)).toStrictEqual(byField(names, initial));
}

/** Without `resetOnSuccess`, every field keeps its value after a successful action. */
export const KeepsValues: Story = {
	async play({ canvas }) {
		await expectKeepsValues(canvas, false);
	},
};

/** An edit form keeps the saved values, instead of reverting to the values it was rendered with. */
export const KeepsValuesWithInitialValues: Story = {
	args: { hasInitialValues: true },
	async play({ canvas }) {
		await expectKeepsValues(canvas, true);
	},
};

/** With `resetOnSuccess`, every field is empty again after a successful action. */
export const ResetOnSuccess: Story = {
	args: { resetOnSuccess: true },
	async play({ canvas }) {
		await expectResetsValues(canvas, false);
	},
};

/** With `resetOnSuccess`, every field is back to its initial value after a successful action. */
export const ResetOnSuccessWithInitialValues: Story = {
	args: { hasInitialValues: true, resetOnSuccess: true },
	async play({ canvas }) {
		await expectResetsValues(canvas, true);
	},
};
