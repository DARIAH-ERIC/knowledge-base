import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "./field";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./select";

const meta = {
	title: "Components/Select",
	component: Select,
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof Select>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
	render(props) {
		return (
			<div className="w-48">
				<Select {...props}>
					<Label>{"Country"}</Label>
					<SelectTrigger />
					<SelectContent>
						<SelectItem id="at">{"Austria"}</SelectItem>
						<SelectItem id="de">{"Germany"}</SelectItem>
						<SelectItem id="fr">{"France"}</SelectItem>
						<SelectItem id="es">{"Spain"}</SelectItem>
					</SelectContent>
				</Select>
			</div>
		);
	},
};

export const WithPlaceholder: Story = {
	args: { placeholder: "Select a role..." },
	render(props) {
		return (
			<div className="w-48">
				<Select {...props}>
					<Label>{"Role"}</Label>
					<SelectTrigger />
					<SelectContent>
						<SelectItem id="admin">{"Admin"}</SelectItem>
						<SelectItem id="editor">{"Editor"}</SelectItem>
						<SelectItem id="viewer">{"Viewer"}</SelectItem>
					</SelectContent>
				</Select>
			</div>
		);
	},
};
