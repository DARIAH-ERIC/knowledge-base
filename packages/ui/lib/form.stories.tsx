import {
	type ActionState,
	createActionStateError,
	createActionStateInitial,
	createActionStateSuccess,
} from "@dariah-eric/next-lib/actions";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ReactNode, useActionState, useState } from "react";
import type { Key } from "react-aria-components";
import { expect, userEvent, within } from "storybook/test";

import { Button } from "./button";
import { DatePicker, DatePickerTrigger } from "./date-picker";
import { FieldError, Label } from "./field";
import { Form, getResetKeyOnError } from "./form";
import { FormStatus } from "./form-status";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";
import { TextField } from "./text-field";

/**
 * The stories double as tests of how the form's reset interacts with react-aria fields: on a reset,
 * react-aria fields fall back to their value at mount, which would discard a saved edit.
 */

interface FormHarnessProps {
	resetOnError?: boolean;
	resetOnSuccess?: boolean;
}

/** Submits with "Succeed" or "Fail". A failed action rejects the email field. */
function FormHarness(props: Readonly<FormHarnessProps>): ReactNode {
	const { resetOnError, resetOnSuccess } = props;

	const [state, action] = useActionState((_state: ActionState, formData: FormData): ActionState => {
		if (formData.get("intent") === "fail") {
			return createActionStateError({
				message: "Rejected.",
				validationErrors: { email: "Email is taken." },
			});
		}

		return createActionStateSuccess({ message: "Saved." });
	}, createActionStateInitial());

	const [country, setCountry] = useState<Key | null>(null);

	return (
		<div className="inline-80">
			<Form
				action={action}
				className="flex flex-col gap-y-4"
				resetOnError={resetOnError}
				resetOnSuccess={resetOnSuccess}
				state={state}
			>
				<FormStatus state={state} />

				<TextField name="email">
					<Label>{"Email"}</Label>
					<Input />
					<FieldError />
				</TextField>

				<TextField key={`password-${getResetKeyOnError(state)}`} name="password" type="password">
					<Label>{"Password"}</Label>
					<Input />
					<FieldError />
				</TextField>

				<Select onChange={setCountry} value={country}>
					<Label>{"Country"}</Label>
					<SelectTrigger />
					<SelectContent>
						<SelectItem id="at">{"Austria"}</SelectItem>
						<SelectItem id="de">{"Germany"}</SelectItem>
					</SelectContent>
				</Select>

				<DatePicker granularity="day" name="date">
					<Label>{"Date"}</Label>
					<DatePickerTrigger />
				</DatePicker>

				<div className="flex gap-x-2">
					<Button name="intent" type="submit" value="succeed">
						{"Succeed"}
					</Button>
					<Button intent="secondary" name="intent" type="submit" value="fail">
						{"Fail"}
					</Button>
				</div>
			</Form>
		</div>
	);
}

const meta = {
	title: "Components/Form",
	component: FormHarness,
	parameters: {
		layout: "centered",
	},
	args: {},
} satisfies Meta<typeof FormHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];

async function fillForm(canvas: Canvas): Promise<void> {
	await userEvent.type(canvas.getByLabelText("Email"), "jane@example.com");
	await userEvent.type(canvas.getByLabelText("Password"), "secret");

	await userEvent.click(canvas.getByRole("button", { name: /Country/ }));
	/** The listbox is rendered in a popover, outside the canvas. */
	await userEvent.click(await within(document.body).findByRole("option", { name: "Germany" }));

	/** Date segments advance on their own while typing. Day equals month, whatever the locale's order. */
	const [firstSegment] = canvas.getAllByRole("spinbutton");
	await userEvent.click(firstSegment!);
	await userEvent.keyboard("02022026");
}

async function submit(canvas: Canvas, name: "Fail" | "Succeed"): Promise<void> {
	await userEvent.click(canvas.getByRole("button", { name }));
	await canvas.findByText(name === "Fail" ? "Rejected." : "Saved.");
}

function dateValue(canvasElement: HTMLElement): string | undefined {
	return canvasElement.querySelector<HTMLInputElement>('input[name="date"]')?.value;
}

async function expectFilled(canvas: Canvas, canvasElement: HTMLElement): Promise<void> {
	await expect(canvas.getByLabelText("Email")).toHaveValue("jane@example.com");
	await expect(canvas.getByRole("button", { name: /Country/ })).toHaveTextContent("Germany");
	await expect(dateValue(canvasElement)).toBe("2026-02-02");
}

async function expectEmpty(canvas: Canvas, canvasElement: HTMLElement): Promise<void> {
	await expect(canvas.getByLabelText("Email")).toHaveValue("");
	await expect(canvas.getByLabelText("Password")).toHaveValue("");
	await expect(canvas.getByRole("button", { name: /Country/ })).not.toHaveTextContent("Germany");
	await expect(dateValue(canvasElement)).toBe("");
}

/**
 * An edit form keeps the saved values: a reset would revert react-aria fields to their initial
 * value.
 */
export const KeepsValuesAfterSuccess: Story = {
	async play({ canvas, canvasElement }) {
		await fillForm(canvas);
		await submit(canvas, "Succeed");

		await expectFilled(canvas, canvasElement);
		await expect(canvas.getByLabelText("Password")).toHaveValue("secret");
	},
};

/** Rejected input is kept for correction, except for fields keyed with `getResetKeyOnError`. */
export const KeepsValuesAfterError: Story = {
	async play({ canvas, canvasElement }) {
		await fillForm(canvas);
		await submit(canvas, "Fail");

		await expectFilled(canvas, canvasElement);
		await expect(canvas.getByLabelText("Password")).toHaveValue("");
		await expect(canvas.getByText("Email is taken.")).toBeVisible();
	},
};

export const ResetOnSuccess: Story = {
	args: { resetOnSuccess: true },
	async play({ canvas, canvasElement }) {
		await fillForm(canvas);
		await submit(canvas, "Succeed");

		await expectEmpty(canvas, canvasElement);
	},
};

/** The fields are emptied, but still show the server's validation errors. */
export const ResetOnError: Story = {
	args: { resetOnError: true },
	async play({ canvas, canvasElement }) {
		await fillForm(canvas);
		await submit(canvas, "Fail");

		await expectEmpty(canvas, canvasElement);
		await expect(canvas.getByText("Email is taken.")).toBeVisible();
	},
};
