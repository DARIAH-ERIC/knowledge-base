import type { Meta, StoryObj } from "@storybook/react-vite";
import { BoldIcon, ItalicIcon } from "lucide-react";

import { Button } from "@/lib/button";

import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = {
	title: "Components/ToggleGroup",
	component: ToggleGroup,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof ToggleGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
	render(props) {
		return (
			<ToggleGroup {...props}>
				<ToggleGroupItem>
					<Button aria-label="Bold" intent="plain" size="sq-sm">
						<BoldIcon aria-hidden={true} data-slot="icon" />
					</Button>
				</ToggleGroupItem>
				<ToggleGroupItem>
					<Button aria-label="Italic" intent="plain" size="sq-sm">
						<ItalicIcon aria-hidden={true} data-slot="icon" />
					</Button>
				</ToggleGroupItem>
			</ToggleGroup>
		);
	},
};
