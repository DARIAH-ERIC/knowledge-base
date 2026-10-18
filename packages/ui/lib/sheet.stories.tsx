import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import {
	Sheet,
	SheetBody,
	SheetClose,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "./sheet";

const meta = {
	title: "Components/Sheet",
	component: SheetContent,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		position: {
			control: "select",
			options: ["top", "bottom", "left", "right", "start", "end", "center"],
		},
	},
	args: {},
} satisfies Meta<typeof SheetContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: null,
	},
	render(args) {
		return (
			<Sheet>
				<Button intent="outline">{"Open Sheet"}</Button>
				<SheetContent {...args}>
					<SheetHeader>
						<SheetTitle>{"Edit Profile"}</SheetTitle>
					</SheetHeader>
					<SheetBody>
						<p className="text-sm/6 text-muted-fg">
							{"Make changes to your profile here. Click save when you're done."}
						</p>
					</SheetBody>
					<SheetFooter>
						<Button intent="primary">{"Save changes"}</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		);
	},
};

export const End: Story = {
	args: {
		children: null,
		className: "sm:max-w-2xl",
		position: "end",
	},
	render(args) {
		return (
			<Sheet>
				<Button intent="outline">{"Open End Sheet"}</Button>
				<SheetContent {...args}>
					<SheetHeader
						description={"A wide side panel, for example for a form."}
						title={"New entry"}
					/>
					<SheetBody>
						<p className="text-sm/6 text-muted-fg">{"This sheet slides in from the end."}</p>
					</SheetBody>
					<SheetFooter>
						<SheetClose>{"Cancel"}</SheetClose>
						<Button intent="primary">{"Save"}</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		);
	},
};

export const Left: Story = {
	args: {
		children: null,
		position: "left",
	},
	render(args) {
		return (
			<Sheet>
				<Button intent="outline">{"Open Left Sheet"}</Button>
				<SheetContent {...args}>
					<SheetHeader>
						<SheetTitle>{"Navigation"}</SheetTitle>
					</SheetHeader>
					<SheetBody>
						<p className="text-sm/6 text-muted-fg">{"This sheet slides in from the left."}</p>
					</SheetBody>
				</SheetContent>
			</Sheet>
		);
	},
};

export const Bottom: Story = {
	args: {
		children: null,
		position: "bottom",
	},
	render(args) {
		return (
			<Sheet>
				<Button intent="outline">{"Open Bottom Sheet"}</Button>
				<SheetContent {...args}>
					<SheetHeader>
						<SheetTitle>{"More Options"}</SheetTitle>
					</SheetHeader>
					<SheetBody>
						<p className="text-sm/6 text-muted-fg">{"This sheet slides in from the bottom."}</p>
					</SheetBody>
				</SheetContent>
			</Sheet>
		);
	},
};
