import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";

const meta = {
	title: "Components/Button",
	component: Button,
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { children: "Update" },
	render(props) {
		const { children, ...rest } = props;
		return <Button {...rest}>{children}</Button>;
	},
};
