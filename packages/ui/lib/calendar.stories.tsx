import type { Meta, StoryObj } from "@storybook/react-vite";

import { Calendar } from "./calendar";

const meta = {
	title: "Components/Calendar",
	component: Calendar,
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	/** Known a11y violations, reported as warnings until fixed: see #995. */
	parameters: { a11y: { test: "todo" } },
	args: {},
	render(props) {
		return <Calendar {...props} />;
	},
};
