import type { Meta, StoryObj } from "@storybook/react-vite";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";

import { Input, InputGroup } from "./input";
import { TextField } from "./text-field";
import { Label } from "./field";

const meta = {
	title: "Components/Input",
	component: Input,
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: { placeholder: "Enter value..." },
	render(props) {
		return (
			<div className="w-64">
				<TextField>
					<Label>{"Name"}</Label>
					<Input {...props} />
				</TextField>
			</div>
		);
	},
};

export const WithIcon: Story = {
	args: { placeholder: "Search..." },
	render(props) {
		return (
			<div className="w-64">
				<TextField>
					<Label>{"Search"}</Label>
					<InputGroup>
						<MagnifyingGlassIcon />
						<Input {...props} />
					</InputGroup>
				</TextField>
			</div>
		);
	},
};
