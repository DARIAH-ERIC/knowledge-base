import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";
import {
	DialogBody,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./dialog";
import {
	Modal,
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalTitle,
	ModalTrigger,
} from "./modal";

const meta = {
	title: "Components/Dialog",
	component: Modal,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: "select",
			options: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl"],
		},
	},
	args: {},
} satisfies Meta<typeof ModalContent>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render() {
		return (
			<Modal>
				<Button intent="outline">{"Open Dialog"}</Button>
				<ModalContent>
					<ModalHeader>
						<ModalTitle>{"Edit Profile"}</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<p className="text-sm/6 text-muted-fg">
							{"Make changes to your profile here. Click save when you're done."}
						</p>
					</ModalBody>
					<ModalFooter>
						<ModalClose>{"Cancel"}</ModalClose>
						<Button intent="primary">{"Save changes"}</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		);
	},
};

export const AlertDialog: Story = {
	render() {
		return (
			<Modal>
				<Button intent="danger">{"Delete account"}</Button>
				<ModalContent role="alertdialog">
					<ModalHeader>
						<ModalTitle>{"Are you sure?"}</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<p className="text-sm/6 text-muted-fg">
							{
								"This action cannot be undone. This will permanently delete your account and remove your data from our servers."
							}
						</p>
					</ModalBody>
					<ModalFooter>
						<ModalClose>{"Cancel"}</ModalClose>
						<Button intent="danger">{"Delete account"}</Button>
					</ModalFooter>
				</ModalContent>
			</Modal>
		);
	},
};

export const WithDescription: Story = {
	render() {
		return (
			<Modal>
				<Button intent="outline">{"Subscribe"}</Button>
				<ModalContent size="sm">
					<DialogHeader>
						<DialogTitle>{"Subscribe to newsletter"}</DialogTitle>
						<DialogDescription>
							{"Get the latest updates delivered to your inbox. You can unsubscribe at any time."}
						</DialogDescription>
					</DialogHeader>
					<DialogBody>
						<p className="text-sm/6 text-muted-fg">
							{"We send weekly digests with curated content and announcements."}
						</p>
					</DialogBody>
					<DialogFooter>
						<ModalClose>{"No thanks"}</ModalClose>
						<Button intent="primary">{"Subscribe"}</Button>
					</DialogFooter>
				</ModalContent>
			</Modal>
		);
	},
};

export const WithTrigger: Story = {
	render() {
		return (
			<Modal>
				<ModalTrigger>{"Open with text trigger"}</ModalTrigger>
				<ModalContent size="xs">
					<ModalHeader>
						<ModalTitle>{"Quick info"}</ModalTitle>
					</ModalHeader>
					<ModalBody>
						<p className="text-sm/6 text-muted-fg">{"A small dialog with a text trigger."}</p>
					</ModalBody>
					<ModalFooter>
						<ModalClose>{"Close"}</ModalClose>
					</ModalFooter>
				</ModalContent>
			</Modal>
		);
	},
};
