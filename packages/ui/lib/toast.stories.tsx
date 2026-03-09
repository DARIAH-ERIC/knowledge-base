import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import { queue, ToastRegion } from "./toast";

const meta = {
	title: "Components/Toast",
	component: ToastRegion,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {},
} satisfies Meta<typeof ToastRegion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render() {
		return (
			<>
				<Button
					intent="outline"
					onPress={() => {
						queue.add({ title: "Changes saved", description: "Your changes have been saved." });
					}}
				>
					{"Show toast"}
				</Button>
				<ToastRegion />
			</>
		);
	},
};

export const TitleOnly: Story = {
	render() {
		return (
			<>
				<Button
					intent="outline"
					onPress={() => {
						queue.add({ title: "Profile updated" });
					}}
				>
					{"Show toast"}
				</Button>
				<ToastRegion />
			</>
		);
	},
};

export const Multiple: Story = {
	render() {
		return (
			<div className="flex gap-2">
				<Button
					intent="outline"
					onPress={() => {
						queue.add({ title: "File uploaded", description: "document.pdf has been uploaded." });
					}}
				>
					{"Upload"}
				</Button>
				<Button
					intent="outline"
					onPress={() => {
						queue.add({ title: "File deleted", description: "photo.jpg has been removed." });
					}}
				>
					{"Delete"}
				</Button>
				<Button
					intent="outline"
					onPress={() => {
						queue.add({ title: "Invitation sent", description: "An email was sent to the team." });
					}}
				>
					{"Invite"}
				</Button>
				<ToastRegion />
			</div>
		);
	},
};
