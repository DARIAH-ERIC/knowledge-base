import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./field";
import { MultipleSelect, MultipleSelectContent, MultipleSelectItem } from "./multiple-select";

const meta = {
	title: "Components/MultipleSelect",
	component: MultipleSelect,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {},
} satisfies Meta<typeof MultipleSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

const frameworks = [
	{ id: "react", name: "React" },
	{ id: "vue", name: "Vue" },
	{ id: "angular", name: "Angular" },
	{ id: "svelte", name: "Svelte" },
	{ id: "solid", name: "Solid" },
];

export const Default: Story = {
	args: {},
	render(props) {
		return (
			<div className="w-72">
				<MultipleSelect aria-label="Frameworks" {...props}>
					<Label>{"Frameworks"}</Label>
					<MultipleSelectContent items={frameworks}>
						{(item) => {
							return <MultipleSelectItem id={item.id}>{item.name}</MultipleSelectItem>;
						}}
					</MultipleSelectContent>
				</MultipleSelect>
			</div>
		);
	},
};

const roles = [
	{ id: "admin", name: "Admin" },
	{ id: "editor", name: "Editor" },
	{ id: "viewer", name: "Viewer" },
	{ id: "contributor", name: "Contributor" },
];

export const WithPlaceholder: Story = {
	args: {},
	render(props) {
		return (
			<div className="w-72">
				<MultipleSelect aria-label="Roles" placeholder="Select roles..." {...props}>
					<Label>{"Roles"}</Label>
					<MultipleSelectContent items={roles}>
						{(item) => {
							return <MultipleSelectItem id={item.id}>{item.name}</MultipleSelectItem>;
						}}
					</MultipleSelectContent>
				</MultipleSelect>
			</div>
		);
	},
};
