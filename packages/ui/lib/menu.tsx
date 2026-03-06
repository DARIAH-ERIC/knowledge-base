"use client";

import { CheckIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import type { ReactNode } from "react";
import {
	Button as AriaButton,
	type ButtonProps as AriaButtonProps,
	Collection as AriaCollection,
	composeRenderProps,
	Header as AriaHeader,
	Menu as AriaMenu,
	MenuItem as AriaMenuItem,
	type MenuItemProps as AriaMenuItemProps,
	type MenuProps as AriaMenuProps,
	MenuSection as MenuSectionPrimitive,
	type MenuSectionProps as AriaMenuSectionProps,
	MenuTrigger as AriaMenuTrigger,
	type MenuTriggerProps as AriaMenuTriggerProps,
	SubmenuTrigger as AriaSubmenuTrigger,
	type SubmenuTriggerProps as AriaSubmenuTriggerProps,
} from "react-aria-components";
import { twJoin, twMerge } from "tailwind-merge";
import { tv, type VariantProps } from "tailwind-variants";

import {
	DropdownDescription,
	dropdownItemStyles,
	DropdownKeyboard,
	DropdownLabel,
	dropdownSectionStyles,
	DropdownSeparator,
} from "@/lib/dropdown";
import { PopoverContent, type PopoverContentProps } from "@/lib/popover";
import { cx } from "@/lib/primitive";

export interface MenuProps extends AriaMenuTriggerProps {}

export function Menu(props: Readonly<MenuProps>): ReactNode {
	return <AriaMenuTrigger {...props} />;
}

export interface MenuSubMenuProps extends AriaSubmenuTriggerProps {}

export function MenuSubMenu(props: Readonly<MenuSubMenuProps>): ReactNode {
	const { children, delay = 0, ...rest } = props;

	return (
		<AriaSubmenuTrigger {...rest} delay={delay}>
			{children}
		</AriaSubmenuTrigger>
	);
}

interface MenuTriggerProps extends AriaButtonProps {}

export function MenuTrigger(props: Readonly<MenuTriggerProps>): ReactNode {
	const { className, ...rest } = props;

	return (
		<AriaButton
			className={cx(
				"relative inline text-left outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
				className,
			)}
			data-slot="menu-trigger"
			{...rest}
		/>
	);
}

interface MenuContentProps<T> extends AriaMenuProps<T>, Pick<PopoverContentProps, "placement"> {
	className?: string;
	popover?: Pick<
		PopoverContentProps,
		| "arrow"
		| "className"
		| "placement"
		| "offset"
		| "crossOffset"
		| "arrowBoundaryOffset"
		| "triggerRef"
		| "isOpen"
		| "onOpenChange"
		| "shouldFlip"
	>;
}

export const menuContentStyles = tv({
	base: "grid max-h-[inherit] grid-cols-[auto_1fr] overflow-y-auto overflow-x-hidden overscroll-contain p-1 outline-hidden [clip-path:inset(0_0_0_0_round_calc(var(--radius-xl)-(--spacing(1))))] *:[[role='group']+[role=group]]:mt-1 *:[[role='group']+[role=separator]]:mt-1",
});

export function MenuContent<T extends object>(props: Readonly<MenuContentProps<T>>): ReactNode {
	const { className, placement, popover, ...rest } = props;

	return (
		<PopoverContent
			className={cx("min-w-32", popover?.className)}
			placement={placement}
			{...popover}
		>
			<AriaMenu className={menuContentStyles({ className })} data-slot="menu-content" {...rest} />
		</PopoverContent>
	);
}

interface MenuItemProps extends AriaMenuItemProps, VariantProps<typeof dropdownItemStyles> {}

export function MenuItem(props: Readonly<MenuItemProps>): ReactNode {
	const { className, intent, children, ...rest } = props;

	// eslint-disable-next-line @eslint-react/prefer-destructuring-assignment
	const textValue = props.textValue ?? (typeof children === "string" ? children : undefined);

	return (
		<AriaMenuItem
			className={composeRenderProps(className, (className, { hasSubmenu, ...renderProps }) => {
				return dropdownItemStyles({
					...renderProps,
					intent,
					className: hasSubmenu
						? twMerge(
								intent === "danger" && "open:bg-danger-subtle open:text-danger-subtle-fg",
								intent === "warning" && "open:bg-warning-subtle open:text-warning-subtle-fg",
								intent === undefined &&
									"open:bg-accent open:text-accent-fg open:*:data-[slot=icon]:text-accent-fg open:*:[.text-muted-fg]:text-accent-fg",
								className,
							)
						: className,
				});
			})}
			data-slot="menu-item"
			textValue={textValue}
			{...rest}
		>
			{(values) => {
				return (
					<>
						{values.isSelected && (
							<span
								className={twJoin(
									"group-has-data-[slot=avatar]:absolute group-has-data-[slot=avatar]:right-0",
									"group-has-data-[slot=icon]:absolute group-has-data-[slot=icon]:right-0",
								)}
							>
								{values.selectionMode === "single" && (
									<CheckIcon className="-mx-0.5 mr-2 size-4" data-slot="check-indicator" />
								)}
								{values.selectionMode === "multiple" && (
									<CheckIcon className="-mx-0.5 mr-2 size-4" data-slot="check-indicator" />
								)}
							</span>
						)}

						{typeof children === "function" ? children(values) : children}

						{values.hasSubmenu && (
							<ChevronRightIcon className="absolute right-2 size-3.5" data-slot="chevron" />
						)}
					</>
				);
			}}
		</AriaMenuItem>
	);
}

export interface MenuHeaderProps extends React.ComponentProps<typeof AriaHeader> {
	separator?: boolean;
}

export function MenuHeader(props: Readonly<MenuHeaderProps>): ReactNode {
	const { className, separator = false, ...rest } = props;

	return (
		<AriaHeader
			className={twMerge(
				"col-span-full px-2.5 py-2 font-medium text-base sm:text-sm",
				separator && "-mx-1 mb-1 border-b sm:px-3 sm:pb-2.5",
				className,
			)}
			{...rest}
		/>
	);
}

const { section, header } = dropdownSectionStyles();

interface MenuSectionProps<T> extends AriaMenuSectionProps<T> {
	ref?: React.Ref<HTMLDivElement>;
	label?: string;
}

export function MenuSection<T extends object>(props: Readonly<MenuSectionProps<T>>): ReactNode {
	const { className, ref, ...rest } = props;

	return (
		<MenuSectionPrimitive ref={ref} className={section({ className })} {...rest}>
			{"label" in props && <AriaHeader className={header()}>{props.label}</AriaHeader>}
			<AriaCollection items={props.items}>{props.children}</AriaCollection>
		</MenuSectionPrimitive>
	);
}

export const MenuSeparator = DropdownSeparator;
export const MenuShortcut = DropdownKeyboard;
export const MenuLabel = DropdownLabel;
export const MenuDescription = DropdownDescription;
