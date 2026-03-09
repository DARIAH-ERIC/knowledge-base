"use client";

import { CheckIcon } from "@heroicons/react/16/solid";
import { Fragment, type ReactNode } from "react";
import {
	Collection,
	composeRenderProps,
	Header,
	ListBoxItem as ListBoxItemPrimitive,
	type ListBoxItemProps,
	ListBoxSection,
	type ListBoxSectionProps,
	Separator,
	type SeparatorProps,
	Text,
	type TextProps,
} from "react-aria-components";
import { twJoin, twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { Keyboard } from "./keyboard";

/**
 * Note: This is not exposed component, but it's used in other components to render dropdowns.
 * @internal
 */
export const dropdownSectionStyles = tv({
	slots: {
		section: "col-span-full grid grid-cols-[auto_1fr]",
		header:
			"col-span-full px-3.5 py-2 font-medium text-muted-fg text-sm/6 sm:px-2.5 sm:py-1.5 sm:text-xs/3",
	},
});

const { section, header } = dropdownSectionStyles();

export interface DropdownSectionProps<T> extends ListBoxSectionProps<T> {
	title?: string;
}

export function DropdownSection<T extends object>({
	className,
	children,
	...props
}: Readonly<DropdownSectionProps<T>>): ReactNode {
	return (
		<ListBoxSection className={section({ className })}>
			{"title" in props && <Header className={header()}>{props.title}</Header>}
			<Collection items={props.items}>{children}</Collection>
		</ListBoxSection>
	);
}

export const dropdownItemStyles = tv({
	base: [
		"min-w-0 [--mr-icon:--spacing(2)] sm:[--mr-icon:--spacing(1.5)]",
		"col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] px-3 py-2 sm:px-2.5 sm:py-1.5 supports-[grid-template-columns:subgrid]:grid-cols-subgrid",
		"not-has-[[slot=description]]:items-center",
		"group relative cursor-default select-none rounded-[calc(var(--radius-xl)-(--spacing(1)))] text-base/6 text-fg outline-0 sm:text-sm/6",
		"**:data-[slot=avatar]:mr-(--mr-icon) **:data-[slot=avatar]:[--avatar-size:--spacing(6)] **:data-[slot=avatar]:*:mr-(--mr-icon) sm:**:data-[slot=avatar]:[--avatar-size:--spacing(5)]",
		// eslint-disable-next-line better-tailwindcss/enforce-consistent-class-order
		"**:data-[slot=icon]:size-5 **:data-[slot=icon]:shrink-0 [&_[data-slot='icon']:not([class*='text-'])]:text-muted-fg sm:**:data-[slot=icon]:size-4 *:data-[slot=icon]:mr-(--mr-icon) has-data-[slot=description]:**:data-[slot=icon]:h-lh",
		"[&>[slot=label]+[data-slot=icon]]:absolute [&>[slot=label]+[data-slot=icon]]:right-1",
		"forced-color-adjust-none forced-colors:text-[CanvasText] forced-colors:**:data-[slot=icon]:text-[CanvasText] forced-colors:group-focus:**:data-[slot=icon]:text-[CanvasText]",
	],
	variants: {
		intent: {
			danger: [
				"text-danger-subtle-fg focus:text-danger-subtle-fg [&_[data-slot='icon']:not([class*='text-'])]:text-danger-subtle-fg/70",
				"*:[[slot=description]]:text-danger-subtle-fg/80 focus:*:[[slot=description]]:text-danger-subtle-fg focus:*:[[slot=label]]:text-danger-subtle-fg",
				"focus:bg-danger-subtle focus:text-danger-subtle-fg focus:[&_[data-slot='icon']:not([class*='text-'])]:text-danger-subtle-fg forced-colors:focus:text-[Mark]",
			],
			warning: [
				"text-warning-subtle-fg focus:text-warning-subtle-fg [&_[data-slot='icon']:not([class*='text-'])]:text-warning-subtle-fg/70",
				"*:[[slot=description]]:text-warning-subtle-fg/80 focus:*:[[slot=description]]:text-warning-subtle-fg focus:*:[[slot=label]]:text-warning-subtle-fg",
				"focus:bg-warning-subtle focus:text-warning-subtle-fg focus:[&_[data-slot='icon']:not([class*='text-'])]:text-warning-subtle-fg",
			],
		},
		isDisabled: {
			true: "text-muted-fg forced-colors:text-[GrayText]",
		},
		isSelected: {
			true: "**:data-[slot=icon]:text-accent-fg",
		},
		isFocused: {
			true: [
				"**:data-[slot=icon]:text-accent-fg **:[kbd]:text-accent-fg",
				"bg-accent text-accent-fg forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
				"*:[[slot=description]]:text-accent-fg *:[[slot=label]]:text-accent-fg [&_.text-muted-fg]:text-accent-fg/80",
			],
		},
		isHovered: {
			true: [
				"**:data-[slot=icon]:text-accent-fg **:[kbd]:text-accent-fg",
				"bg-accent text-accent-fg forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
				"*:[[slot=description]]:text-accent-fg *:[[slot=label]]:text-accent-fg [&_.text-muted-fg]:text-accent-fg/80",
			],
		},
	},
});

export interface DropdownItemProps extends ListBoxItemProps {
	intent?: "danger" | "warning";
}

export function DropdownItem({
	className,
	children,
	intent,
	...props
}: Readonly<DropdownItemProps>): ReactNode {
	const textValue = typeof children === "string" ? children : undefined;
	return (
		<ListBoxItemPrimitive
			className={composeRenderProps(className, (className, renderProps) => {
				return dropdownItemStyles({ ...renderProps, intent, className });
			})}
			textValue={textValue}
			{...props}
		>
			{composeRenderProps(children, (children, { isSelected }) => {
				return (
					<Fragment>
						{isSelected && (
							<CheckIcon
								className={twJoin(
									"mr-1.5 -ml-0.5 h-[lh] w-4 shrink-0",
									"group-has-data-[slot=icon]:absolute group-has-data-[slot=icon]:top-1/2 group-has-data-[slot=icon]:right-0.5 group-has-data-[slot=icon]:-translate-y-1/2",
									"group-has-data-[slot=avatar]:absolute group-has-data-[slot=avatar]:top-1/2 group-has-data-[slot=avatar]:right-0.5 group-has-data-[slot=avatar]:-translate-y-1/2",
								)}
								data-slot="check-indicator"
							/>
						)}
						{typeof children === "string" ? <DropdownLabel>{children}</DropdownLabel> : children}
					</Fragment>
				);
			})}
		</ListBoxItemPrimitive>
	);
}

export interface DropdownLabelProps extends TextProps {
	ref?: React.Ref<HTMLDivElement>;
}

export function DropdownLabel({
	className,
	ref,
	...props
}: Readonly<DropdownLabelProps>): ReactNode {
	return <Text ref={ref} className={twMerge("col-start-2", className)} slot="label" {...props} />;
}

export interface DropdownDescriptionProps extends TextProps {
	ref?: React.Ref<HTMLDivElement>;
}

export function DropdownDescription({
	className,
	ref,
	...props
}: Readonly<DropdownDescriptionProps>): ReactNode {
	return (
		<Text
			ref={ref}
			className={twMerge("col-start-2 font-normal text-muted-fg text-sm", className)}
			slot="description"
			{...props}
		/>
	);
}

export function DropdownSeparator({ className, ...props }: Readonly<SeparatorProps>): ReactNode {
	return (
		<Separator
			className={twMerge("col-span-full -mx-1 my-1 h-px bg-fg/10", className)}
			orientation="horizontal"
			{...props}
		/>
	);
}

export type DropdownKeyboardProps = React.ComponentProps<typeof Keyboard> & {
	keys?: React.ReactNode;
};

export function DropdownKeyboard({
	className,
	...props
}: Readonly<DropdownKeyboardProps>): ReactNode {
	return (
		<Keyboard
			className={twMerge(
				"absolute right-2 pl-2 group-hover:text-primary-fg group-focus:text-primary-fg",
				className,
			)}
			{...props}
		/>
	);
}
