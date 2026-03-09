"use client";

import { Fragment, type ReactNode, type RefObject } from "react";
import {
	composeRenderProps,
	SelectionIndicator,
	Tab as TabPrimitive,
	TabList as TabListPrimitive,
	type TabListProps as TabListPrimitiveProps,
	TabPanel as TabPanelPrimitive,
	type TabPanelProps as TabPanelAriaProps,
	type TabProps as TabPrimitiveProps,
	Tabs as TabsPrimitive,
	TabsContext,
	type TabsProps as TabsPrimitiveProps,
	useSlottedContext,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { cx } from "@/lib/primitive";

export interface TabsProps extends TabsPrimitiveProps {
	ref?: React.RefObject<HTMLDivElement>;
}

export function Tabs(props: Readonly<TabsProps>): ReactNode {
	const { className, ref, orientation = "horizontal", ...rest } = props;

	return (
		// eslint-disable-next-line @eslint-react/no-unstable-context-value
		<TabsContext value={{ orientation }}>
			<TabsPrimitive
				{...rest}
				ref={ref}
				className={cx(
					orientation === "vertical" ? "w-full flex-row" : "flex-col",
					"group/tabs flex gap-4 forced-color-adjust-none",
					className,
				)}
				orientation={orientation}
			/>
		</TabsContext>
	);
}

export interface TabListProps<T extends object> extends TabListPrimitiveProps<T> {
	ref?: React.RefObject<HTMLDivElement>;
}

export function TabList<T extends object>(props: Readonly<TabListProps<T>>): ReactNode {
	const { className, ref, ...rest } = props;

	return (
		<TabListPrimitive
			{...rest}
			ref={ref}
			className={composeRenderProps(className, (className, { orientation }) => {
				return twMerge([
					"[--tab-list-gutter:--spacing(1)]",
					"relative flex forced-color-adjust-none",
					orientation === "horizontal" &&
						"flex-row gap-x-(--tab-list-gutter) rounded-(--tab-list-rounded) border-b py-(--tab-list-gutter)",
					orientation === "vertical" &&
						"min-w-56 shrink-0 flex-col items-start gap-y-(--tab-list-gutter) border-l px-(--tab-list-gutter) [--tab-list-gutter:--spacing(2)]",
					className,
				]);
			})}
			data-slot="tab-list"
		/>
	);
}

export interface TabProps extends TabPrimitiveProps {
	ref?: RefObject<HTMLDivElement>;
}

export function Tab(props: Readonly<TabProps>): ReactNode {
	const { children, className, ref, ...rest } = props;

	const { orientation } = useSlottedContext(TabsContext)!;
	return (
		<TabPrimitive
			{...rest}
			ref={ref}
			className={cx(
				"group/tab rounded-lg [--tab-gutter:var(--tab-gutter-x)]",
				orientation === "horizontal"
					? "[--tab-gutter-x:--spacing(2.5)] [--tab-gutter-y:--spacing(1)] first:-ml-(--tab-gutter) last:-mr-(--tab-gutter)"
					: "w-full justify-start [--tab-gutter-x:--spacing(4)] [--tab-gutter-y:--spacing(1.5)]",
				"relative isolate flex cursor-default items-center whitespace-nowrap font-medium text-sm/6 outline-hidden transition",
				"px-(--tab-gutter-x) py-(--tab-gutter-y)",
				"*:data-[slot=icon]:mr-2 *:data-[slot=icon]:-ml-0.5 *:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:self-center *:data-[slot=icon]:text-muted-fg selected:*:data-[slot=icon]:text-primary-subtle-fg",
				"text-muted-fg selected:text-primary-subtle-fg selected:hover:bg-primary-subtle selected:hover:text-primary-subtle-fg hover:bg-secondary hover:text-fg focus:ring-0",
				"disabled:opacity-50",
				"href" in props ? "cursor-pointer" : "cursor-default",
				className,
			)}
			data-slot="tab"
		>
			{(values) => {
				return (
					<Fragment>
						{typeof children === "function" ? children(values) : children}
						<SelectionIndicator
							className={twMerge(
								"absolute bg-primary-subtle-fg transition-[translate,width,height] duration-200",
								orientation === "horizontal"
									? "right-(--tab-gutter-x) -bottom-[calc(var(--tab-gutter-y)+1px)] left-(--tab-gutter-x) h-[2px]"
									: "top-(--tab-gutter-y) bottom-(--tab-gutter-y) -left-[calc(var(--tab-gutter-x)-var(--tab-list-gutter)+1px)] w-[2px]",
							)}
							data-slot="selected-indicator"
						/>
					</Fragment>
				);
			}}
		</TabPrimitive>
	);
}

export interface TabPanelProps extends TabPanelAriaProps {
	ref?: RefObject<HTMLDivElement>;
}

export function TabPanel(props: Readonly<TabPanelProps>): ReactNode {
	const { className, ref, ...rest } = props;

	return (
		<TabPanelPrimitive
			{...rest}
			ref={ref}
			className={cx("flex-1 text-fg text-sm/6 focus-visible:outline-hidden", className)}
			data-slot="tab-panel"
		/>
	);
}
