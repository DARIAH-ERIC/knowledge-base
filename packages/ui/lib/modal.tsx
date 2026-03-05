"use client";

import {
	type DialogProps as AriaDialogProps,
	type DialogTriggerProps as AriaDialogTriggerProps,
	type ModalOverlayProps as AriaModalOverlayProps,
	DialogTrigger as AriaDialogTrigger,
	ModalOverlay as AriaModalOverlay,
	Modal as AriaModal,
} from "react-aria-components";
import { twJoin } from "tailwind-merge";
import { cx } from "@/lib/primitive";
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogCloseIcon,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/lib/dialog";

export function Modal(props: AriaDialogTriggerProps) {
	return <AriaDialogTrigger {...props} />;
}

const sizes = {
	"2xs": "sm:max-w-2xs",
	xs: "sm:max-w-xs",
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
	xl: "sm:max-w-xl",
	"2xl": "sm:max-w-2xl",
	"3xl": "sm:max-w-3xl",
	"4xl": "sm:max-w-4xl",
	"5xl": "sm:max-w-5xl",
	fullscreen: "",
};

export interface ModalContentProps
	extends
		Omit<AriaModalOverlayProps, "className" | "children">,
		Pick<AriaDialogProps, "aria-label" | "aria-labelledby" | "role" | "children"> {
	size?: keyof typeof sizes;
	closeButton?: boolean;
	isBlurred?: boolean;
	className?: AriaModalOverlayProps["className"];
	overlay?: Omit<AriaModalOverlayProps, "children">;
}

export function ModalContent({
	className,
	isDismissable: isDismissableInternal,
	isBlurred = false,
	children,
	overlay,
	size = "lg",
	role = "dialog",
	closeButton = true,
	...props
}: ModalContentProps) {
	const isDismissable = isDismissableInternal ?? role !== "alertdialog";

	return (
		<AriaModalOverlay
			data-slot="modal-overlay"
			isDismissable={isDismissable}
			className={twJoin(
				"fixed inset-0 z-50 h-(--visual-viewport-height,100vh) bg-black/15",
				"grid grid-rows-[1fr_auto] justify-items-center sm:grid-rows-[1fr_auto_3fr]",
				size === "fullscreen" ? "md:p-3" : "md:p-4",
				"entering:fade-in entering:animate-in entering:duration-300 entering:ease-out",
				"exiting:fade-out exiting:animate-out exiting:ease-in",
				isBlurred && "backdrop-blur-[1px]",
			)}
			{...props}
		>
			<AriaModal
				data-slot="modal-content"
				className={cx(
					"row-start-2 w-full text-left align-middle",
					"[--visual-viewport-vertical-padding:16px]",
					size === "fullscreen"
						? "sm:rounded-md sm:[--visual-viewport-vertical-padding:16px]"
						: "sm:rounded-xl sm:[--visual-viewport-vertical-padding:32px]",
					"relative overflow-hidden bg-overlay text-overlay-fg",
					"rounded-t-2xl shadow-lg ring ring-fg/5 dark:ring-border",
					sizes[size],

					"entering:slide-in-from-bottom sm:entering:zoom-in-95 sm:entering:slide-in-from-bottom-0 entering:animate-in entering:duration-300 entering:ease-out",
					"exiting:slide-out-to-bottom sm:exiting:zoom-out-95 sm:exiting:slide-out-to-bottom-0 exiting:animate-out exiting:ease-in",
					className,
				)}
				{...props}
			>
				<Dialog role={role}>
					{(values) => (
						<>
							{typeof children === "function" ? children(values) : children}
							{closeButton && <DialogCloseIcon isDismissable={isDismissable} />}
						</>
					)}
				</Dialog>
			</AriaModal>
		</AriaModalOverlay>
	);
}

const ModalTrigger = DialogTrigger;
const ModalHeader = DialogHeader;
const ModalTitle = DialogTitle;
const ModalDescription = DialogDescription;
const ModalFooter = DialogFooter;
const ModalBody = DialogBody;
const ModalClose = DialogClose;

export {
	ModalTrigger,
	ModalHeader,
	ModalTitle,
	ModalDescription,
	ModalFooter,
	ModalBody,
	ModalClose,
};
