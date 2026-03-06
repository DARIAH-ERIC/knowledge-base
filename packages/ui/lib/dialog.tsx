"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import type { ReactNode } from "react";
import {
	Button as PrimitiveButton,
	Dialog as PrimitiveDialog,
	Heading,
	type HeadingProps,
	type TextProps,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { cx } from "@/lib/primitive";

import { Button, type ButtonProps } from "./button";

export function Dialog({
	role = "dialog",
	className,
	...props
}: Readonly<React.ComponentProps<typeof PrimitiveDialog>>): ReactNode {
	return (
		<PrimitiveDialog
			className={twMerge(
				"peer/dialog group/dialog relative flex max-h-[calc(var(--visual-viewport-height)-var(--visual-viewport-vertical-padding))] flex-col overflow-hidden outline-hidden [--gutter:--spacing(6)] sm:[--gutter:--spacing(8)]",
				className,
			)}
			data-slot="dialog"
			role={role}
			{...props}
		/>
	);
}

export function DialogTrigger({ className, ...props }: Readonly<ButtonProps>): ReactNode {
	return <PrimitiveButton className={cx("cursor-pointer", className)} {...props} />;
}

export interface DialogHeaderProps extends Omit<React.ComponentProps<"div">, "title"> {
	title?: string;
	description?: string;
}

export function DialogHeader({ className, ...props }: Readonly<DialogHeaderProps>): ReactNode {
	return (
		<div
			className={twMerge(
				"relative space-y-1 p-(--gutter) pb-[calc(var(--gutter)---spacing(3))]",
				className,
			)}
			data-slot="dialog-header"
		>
			{props.title != null ? <DialogTitle>{props.title}</DialogTitle> : null}
			{props.description != null ? (
				<DialogDescription>{props.description}</DialogDescription>
			) : null}
			{props.title != null && typeof props.children === "string" ? (
				<DialogTitle>{props.children}</DialogTitle>
			) : (
				props.children
			)}
		</div>
	);
}

export interface DialogTitleProps extends HeadingProps {
	ref?: React.Ref<HTMLHeadingElement>;
}
export function DialogTitle({ className, ref, ...props }: Readonly<DialogTitleProps>): ReactNode {
	return (
		<Heading
			ref={ref}
			className={twMerge("text-balance font-semibold text-fg text-lg/6 sm:text-base/6", className)}
			slot="title"
			{...props}
		/>
	);
}

export interface DialogDescriptionProps extends TextProps {
	ref?: React.Ref<HTMLDivElement>;
}
export function DialogDescription({
	className,
	ref,
	...props
}: Readonly<DialogDescriptionProps>): ReactNode {
	return (
		<p
			ref={ref}
			className={twMerge(
				"text-pretty text-base/6 text-muted-fg group-disabled:opacity-50 sm:text-sm/6",
				className,
			)}
			data-slot="description"
			{...props}
		/>
	);
}

export interface DialogBodyProps extends React.ComponentProps<"div"> {}
export function DialogBody({ className, ...props }: Readonly<DialogBodyProps>): ReactNode {
	return (
		<div
			className={twMerge(
				"isolate flex min-h-0 flex-1 flex-col overflow-auto px-(--gutter) py-1",
				"**:data-[slot=dialog-footer]:px-0 **:data-[slot=dialog-footer]:pt-0",
				className,
			)}
			data-slot="dialog-body"
			{...props}
		/>
	);
}

export interface DialogFooterProps extends React.ComponentProps<"div"> {}
export function DialogFooter({ className, ...props }: Readonly<DialogFooterProps>): ReactNode {
	return (
		<div
			className={twMerge(
				"isolate mt-auto flex flex-col-reverse justify-end gap-3 p-(--gutter) pt-[calc(var(--gutter)---spacing(2))] sm:flex-row group-not-has-data-[slot=dialog-body]/dialog:pt-0 group-not-has-data-[slot=dialog-body]/popover:pt-0",
				className,
			)}
			data-slot="dialog-footer"
			{...props}
		/>
	);
}

export function DialogClose({ intent = "plain", ref, ...props }: Readonly<ButtonProps>): ReactNode {
	return <Button ref={ref} intent={intent} slot="close" {...props} />;
}

export interface CloseButtonIndicatorProps extends Omit<ButtonProps, "children"> {
	className?: string;
	isDismissable?: boolean | undefined;
}

export function DialogCloseIcon({
	className,
	...props
}: Readonly<CloseButtonIndicatorProps>): ReactNode {
	return props.isDismissable != null ? (
		<PrimitiveButton
			aria-label="Close"
			className={cx(
				"absolute end-1 top-1 z-50 grid size-8 place-content-center rounded-xl hover:bg-secondary focus:bg-secondary focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary sm:top-2 sm:size-7 sm:rounded-md",
				className,
			)}
			slot="close"
		>
			<XMarkIcon className="size-4" />
		</PrimitiveButton>
	) : null;
}
