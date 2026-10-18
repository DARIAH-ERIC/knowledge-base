"use client";

import { Fragment, type ReactNode } from "react";
import type { DialogProps as AriaDialogProps } from "react-aria-components/Dialog";
import {
	Sheet as AriaSheet,
	SheetBackdrop as AriaSheetBackdrop,
	SheetContent as AriaSheetContent,
	SheetOverlay as AriaSheetOverlay,
	type SheetOverlayProps as AriaSheetOverlayProps,
	type SheetProps as AriaSheetProps,
	SheetTrigger as AriaSheetTrigger,
	type SheetTriggerProps as AriaSheetTriggerProps,
} from "react-aria-components/Sheet";
import { twJoin } from "tailwind-merge";

import {
	DialogBody,
	DialogClose,
	DialogCloseIcon,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/lib/dialog";
import { cx } from "@/lib/primitive";

export interface SheetProps extends AriaSheetTriggerProps {}

export function Sheet(props: Readonly<SheetProps>): ReactNode {
	return <AriaSheetTrigger {...props} />;
}

const positions = {
	top: "w-full max-w-[800px] rounded-b-4xl border-b [--sheet-stack-y:8px] data-[float=false]:border-x data-[float=true]:mx-2 data-[float=true]:mt-2 data-[float=true]:w-[calc(100%-1rem)] data-[float=true]:border-b-0",
	bottom:
		"w-full max-w-[800px] rounded-t-4xl border-t [--sheet-stack-y:-8px] data-[float=false]:border-x data-[float=true]:mx-2 data-[float=true]:mb-2 data-[float=true]:w-[calc(100%-1rem)] data-[float=true]:border-t-0",
	left: "h-dvh w-3/4 border-r [--sheet-stack-x:8px] sm:max-w-80 data-[float=true]:my-2 data-[float=true]:ml-2 data-[float=true]:h-[calc(100dvh-1rem)] data-[float=true]:border-r-0",
	right:
		"h-dvh w-3/4 border-l [--sheet-stack-x:-8px] sm:max-w-80 data-[float=true]:my-2 data-[float=true]:mr-2 data-[float=true]:h-[calc(100dvh-1rem)] data-[float=true]:border-l-0",
	start:
		"h-dvh w-3/4 border-e [--sheet-stack-x:8px] sm:max-w-80 rtl:[--sheet-stack-x:-8px] data-[float=true]:my-2 data-[float=true]:ms-2 data-[float=true]:h-[calc(100dvh-1rem)] data-[float=true]:border-e-0",
	end: "h-dvh w-3/4 border-s [--sheet-stack-x:-8px] sm:max-w-80 rtl:[--sheet-stack-x:8px] data-[float=true]:my-2 data-[float=true]:me-2 data-[float=true]:h-[calc(100dvh-1rem)] data-[float=true]:border-s-0",
	center: "w-[calc(100%-2rem)] max-w-lg rounded-2xl border data-[float=true]:border-0",
};

export interface SheetContentProps
	extends
		Omit<AriaSheetOverlayProps, "children" | "className">,
		Pick<AriaSheetProps, "className" | "swipeAnimation" | "swipeAnimationRange">,
		Pick<AriaDialogProps, "aria-label" | "aria-labelledby" | "role" | "children"> {
	position?: keyof typeof positions;
	closeButton?: boolean;
	isFloat?: boolean;
	overscrollPadding?: boolean;
	overlay?: Omit<AriaSheetOverlayProps, "children" | "position">;
}

/**
 * A panel sliding in from an edge of the viewport, built on the react-aria `Sheet`, which also lets
 * it be swiped away. Accepts the same header, body and footer slots as `ModalContent`.
 */
export function SheetContent({
	className,
	position = "bottom",
	role = "dialog",
	closeButton = true,
	isFloat = false,
	overscrollPadding,
	overlay,
	snapPoints,
	preventDismissal = false,
	swipeAnimation,
	swipeAnimationRange,
	children,
	...props
}: Readonly<SheetContentProps>): ReactNode {
	return (
		<AriaSheetOverlay
			{...props}
			{...overlay}
			className={cx("z-50", overlay?.className)}
			position={position}
			preventDismissal={preventDismissal}
			snapPoints={snapPoints}
		>
			<AriaSheetBackdrop
				className="bg-black/15 entering:animate-in entering:duration-300 entering:fade-in exiting:animate-out exiting:duration-300 exiting:fade-out"
				swipeAnimation="sheet-backdrop"
				swipeAnimationRange={snapPoints != null ? { start: snapPoints.length - 1 } : undefined}
			/>
			<AriaSheet
				className={cx(
					"relative box-content shrink-0 origin-top transition-transform [--sheet-gap:0px] motion-reduce:transition-none data-[float=true]:[--sheet-gap:16px]",
					"border-fg/20 bg-overlay text-overlay-fg shadow-lg dark:border-border",
					"dark:data-[float=true]:ring-border data-[float=true]:rounded-lg data-[float=true]:ring data-[float=true]:ring-fg/5",
					positions[position],
					className,
				)}
				data-float={isFloat}
				data-slot="sheet"
				overscrollPadding={isFloat ? false : (overscrollPadding ?? true)}
				stackAnimation="sheet-scale-back"
				swipeAnimation={swipeAnimation}
				swipeAnimationRange={swipeAnimationRange}
			>
				{!preventDismissal && position === "bottom" ? (
					<div
						aria-hidden={true}
						className="pointer-events-none absolute inset-s-0 inset-e-0 inset-bs-2 mx-auto rounded-full bg-fg/30 block-1 inline-10"
					/>
				) : null}
				<AriaSheetContent
					aria-label={props["aria-label"]}
					aria-labelledby={props["aria-labelledby"]}
					/**
					 * The sheet content is the dialog, so it takes the same column layout as `Dialog`,
					 * including handing a wrapping form the column, so the body scrolls and the footer stays
					 * reachable.
					 */
					className={twJoin(
						"peer/dialog group/dialog relative flex flex-col overflow-hidden outline-hidden [--gutter:--spacing(6)] max-block-[calc(var(--visual-viewport-height)-var(--sheet-gap))]",
						"[&>form]:flex [&>form]:flex-1 [&>form]:flex-col [&>form]:min-block-0",
					)}
					data-slot="dialog"
					role={role}
				>
					{(values) => (
						<Fragment>
							{typeof children === "function" ? children(values) : children}
							{closeButton ? (
								<DialogCloseIcon
									className="inset-e-2.5 inset-bs-2.5"
									isDismissable={!preventDismissal}
								/>
							) : null}
						</Fragment>
					)}
				</AriaSheetContent>
			</AriaSheet>
		</AriaSheetOverlay>
	);
}

export const SheetTrigger = DialogTrigger;
export const SheetFooter = DialogFooter;
export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;
export const SheetBody = DialogBody;
export const SheetClose = DialogClose;
