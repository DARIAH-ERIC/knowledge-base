import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tree, TreeContent, TreeItem } from "@/lib/tree";

const meta = {
	title: "Components/Tree",
	component: Tree,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof Tree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		selectionMode: "none",
	},
	render(props) {
		const { ...rest } = props;

		return (
			<Tree {...rest}>
				<TreeItem textValue="One">
					<TreeContent>{"One"}</TreeContent>
				</TreeItem>
				<TreeItem textValue="Two">
					<TreeContent>{"Two"}</TreeContent>
				</TreeItem>
			</Tree>
		);
	},
};
