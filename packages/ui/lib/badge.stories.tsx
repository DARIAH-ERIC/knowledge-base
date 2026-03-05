import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";

const meta = {
	title: "Components/Badge",
	component: Badge,
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { children: "success" },
	render(props) {
		const { children, ...rest } = props;
		return <Badge {...rest}>{children}</Badge>;
	},
};
