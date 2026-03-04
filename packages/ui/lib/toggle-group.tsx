"use client";

import { createContext, type ReactNode, use } from "react";
import {
	composeRenderProps,
	ToggleButton as AriaToggleButton,
	ToggleButtonGroup as AriaToggleButtonGroup,
	type ToggleButtonGroupProps as AriaToggleButtonGroupProps,
	type ToggleButtonProps as AriaToggleButtonProps,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { cx } from "@/lib/primitive";

type ToggleSize = "xs" | "sm" | "md" | "lg" | "sq-xs" | "sq-sm" | "sq-md" | "sq-lg";

interface ToggleGroupContextValue extends Pick<
	AriaToggleButtonGroupProps,
	"selectionMode" | "orientation"
> {
	size?: ToggleSize;
}

const ToggleGroupContext = createContext<ToggleGroupContextValue>({
	size: "md",
	selectionMode: "single",
	orientation: "horizontal",
});

function useToggleGroupContext() {
	return use(ToggleGroupContext);
}

export interface ToggleGroupProps extends AriaToggleButtonGroupProps {
	size?: ToggleSize;
	isCircle?: boolean;
}

export function ToggleGroup(props: Readonly<ToggleGroupProps>): ReactNode {
	const {
		size = "md",
		orientation = "horizontal",
		selectionMode = "single",
		isCircle,
		className,
		...rest
	} = props;

	return (
		// eslint-disable-next-line @eslint-react/no-unstable-context-value
		<ToggleGroupContext value={{ size, selectionMode, orientation }}>
			<AriaToggleButtonGroup
				{...rest}
				className={cx(
					[
						"[--toggle-group-radius:var(--radius-lg)] [--toggle-gutter:--spacing(0.5)]",
						"[--toggle-fg:var(--color-fg)] [--toggle-selected-bg:var(--color-primary)] [--toggle-selected-fg:var(--color-primary-fg)]",
						"[--toggle-focused-bg:var(--color-secondary)] [--toggle-focused-fg:var(--color-secondary-fg)]",
						"[--toggle-hover-bg:var(--toggle-focused-bg)] [--toggle-hover-fg:var(--toggle-focused-fg)]",
						"[--toggle-icon:color-mix(in_oklab,var(--toggle-focused-fg)_50%,var(--toggle-focused-bg))]",
						"inset-ring inset-ring-border inline-flex overflow-hidden p-(--toggle-gutter)",
						orientation === "horizontal" ? "flex-row" : "flex-col",
						selectionMode === "single" ? "gap-(--toggle-gutter)" : "gap-0",
						isCircle === true ? "rounded-full" : "rounded-(--toggle-group-radius)",
						selectionMode === "single" &&
							isCircle === true &&
							"*:data-[slot=toggle-group-item]:rounded-full",
						selectionMode === "multiple" &&
							isCircle === true &&
							"*:data-[slot=toggle-group-item]:last:rounded-r-full *:data-[slot=toggle-group-item]:first:rounded-l-full",
					],
					className,
				)}
				data-slot="control"
				selectionMode={selectionMode}
			/>
		</ToggleGroupContext>
	);
}

export const toggleGroupItemStyles = tv({
	base: [
		"relative isolate",
		"inline-flex flex-row items-center font-medium text-(--toggle-fg) outline-hidden",
		"inset-ring inset-ring-transparent",
		"*:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-(--btn-icon) focus-visible:*:data-[slot=icon]:text-(--btn-icon-active)/80 hover:*:data-[slot=icon]:text-(--btn-icon-active)/90",
		"forced-colors:[--btn-icon:ButtonText] forced-colors:hover:[--btn-icon:ButtonText]",
	],
	variants: {
		orientation: {
			horizontal: "justify-center",
			vertical: "justify-start",
		},
		selectionMode: {
			single: "rounded-[calc(var(--toggle-group-radius)-var(--toggle-gutter))]",
			multiple: "rounded-none",
		},
		size: {
			xs: [
				"min-h-8 gap-x-1.5 px-2.5 py-1.5 text-sm sm:min-h-7 sm:px-2 sm:py-1.5 sm:text-xs/4",
				"*:data-[slot=icon]:-mx-px *:data-[slot=icon]:size-3.5 sm:*:data-[slot=icon]:size-3",
				"*:data-[slot=loader]:-mx-px *:data-[slot=loader]:size-3.5 sm:*:data-[slot=loader]:size-3",
			],
			sm: [
				"min-h-9 gap-x-1.5 px-3 py-1.5 sm:min-h-8 sm:px-2.5 sm:py-1.5 sm:text-sm/5",
				"*:data-[slot=icon]:size-4.5 sm:*:data-[slot=icon]:size-4",
				"*:data-[slot=loader]:size-4.5 sm:*:data-[slot=loader]:size-4",
			],
			md: [
				"min-h-10 gap-x-2 px-3.5 py-2 sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-sm/6",
				"*:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4",
				"*:data-[slot=loader]:size-5 sm:*:data-[slot=loader]:size-4",
			],
			lg: [
				"min-h-11 gap-x-2 px-4 py-2.5 sm:min-h-10 sm:px-3.5 sm:py-2 sm:text-sm/6",
				"*:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4.5",
				"*:data-[slot=loader]:size-5 sm:*:data-[slot=loader]:size-4.5",
			],
			"sq-xs":
				"touch-area size-8 sm:size-7 sm:*:data-[slot=icon]:size-3 sm:*:data-[slot=loader]:size-3 *:data-[slot=icon]:size-3.5 *:data-[slot=loader]:size-3.5",
			"sq-sm":
				"touch-area size-9 sm:size-8 sm:*:data-[slot=icon]:size-4 sm:*:data-[slot=loader]:size-4 *:data-[slot=icon]:size-4.5 *:data-[slot=loader]:size-4.5",
			"sq-md":
				"touch-area size-10 sm:size-9 sm:*:data-[slot=icon]:size-4.5 sm:*:data-[slot=loader]:size-4.5 *:data-[slot=icon]:size-5 *:data-[slot=loader]:size-5",
			"sq-lg":
				"touch-area size-11 sm:size-10 sm:*:data-[slot=icon]:size-5 sm:*:data-[slot=loader]:size-5 *:data-[slot=icon]:size-5 *:data-[slot=loader]:size-5",
		},
		isSelected: {
			true: "inset-ring-fg/20 bg-(--toggle-selected-bg) text-(--toggle-selected-fg) [--toggle-icon:var(--primary-fg)] hover:bg-(--toggle-selected-bg)/90",
		},
		isFocused: {
			true: "not-selected:bg-(--toggle-focused-bg) not-selected:text-(--toggle-focused-fg) not-selected:[--toggle-icon:var(--toggle-focused-fg)]",
		},
		isHovered: {
			true: "enabled:not-selected:bg-(--toggle-hover-bg) enabled:not-selected:text-(--toggle-hover-fg) enabled:not-selected:[--toggle-icon:var(--toggle-hover-fg)]",
		},
		isDisabled: {
			true: "opacity-50 forced-colors:text-[GrayText]",
		},
	},
	defaultVariants: {
		size: "md",
	},
	compoundVariants: [
		{
			selectionMode: "multiple",
			orientation: "horizontal",
			className:
				"not-first:-ml-px first:rounded-l-[calc(var(--toggle-group-radius)-var(--toggle-gutter))] last:rounded-r-[calc(var(--toggle-group-radius)-var(--toggle-gutter))]",
		},
		{
			selectionMode: "multiple",
			orientation: "vertical",
			className:
				"not-first:-mt-px first:rounded-t-[calc(var(--toggle-group-radius)-var(--toggle-gutter))] last:rounded-b-[calc(var(--toggle-group-radius)-var(--toggle-gutter))]",
		},
	],
});

export interface ToggleGroupItemProps extends AriaToggleButtonProps {
	size?: ToggleSize;
}

export function ToggleGroupItem(props: Readonly<ToggleGroupItemProps>): ReactNode {
	const { className, ...rest } = props;

	const { size, selectionMode, orientation } = useToggleGroupContext();

	return (
		<AriaToggleButton
			{...rest}
			className={composeRenderProps(className, (className, renderProps) => {
				return twMerge(
					toggleGroupItemStyles({
						...renderProps,
						size,
						orientation,
						selectionMode,
						className,
					}),
				);
			})}
			data-slot="toggle-group-item"
		/>
	);
}
