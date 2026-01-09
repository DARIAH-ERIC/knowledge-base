/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @eslint-react/prefer-read-only-props */
/* eslint-disable better-tailwindcss/no-unknown-classes */

"use client";

import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { createContext, type ReactNode, use } from "react";
import {
	Button,
	Cell,
	type CellProps,
	Collection,
	Column,
	type ColumnProps,
	ColumnResizer as ColumnResizerPrimitive,
	type ColumnResizerProps,
	composeRenderProps,
	ResizableTableContainer,
	Row,
	type RowProps,
	Table as TablePrimitive,
	TableBody as TableBodyPrimitive,
	type TableBodyProps,
	TableHeader as TableHeaderPrimitive,
	type TableHeaderProps as HeaderProps,
	type TableProps as TablePrimitiveProps,
	useTableOptions,
} from "react-aria-components";
import { twJoin, twMerge } from "tailwind-merge";

import { Checkbox } from "@/components/ui/checkbox";
import { cx } from "@/components/ui/cx";

export interface TableProps extends Omit<TablePrimitiveProps, "className"> {
	allowResize?: boolean;
	className?: string;
	bleed?: boolean;
	grid?: boolean;
	striped?: boolean;
	ref?: React.Ref<HTMLTableElement>;
}

export const TableContext = createContext<TableProps>({
	allowResize: false,
});

export function useTableContext() {
	return use(TableContext);
}

export function Root(props: TableProps): ReactNode {
	return (
		<TablePrimitive
			className="w-full min-w-full caption-bottom text-sm/6 outline-hidden [--table-selected-bg:var(--color-secondary)]/50"
			{...props}
		/>
	);
}

export function Table({
	allowResize,
	className,
	bleed = false,
	grid = false,
	striped = false,
	ref,
	...props
}: Readonly<TableProps>): ReactNode {
	// eslint-disable-next-line @eslint-react/no-unstable-context-value
	const value = { allowResize, bleed, grid, striped };

	return (
		<TableContext value={value}>
			<div className="flow-root">
				<div
					className={twMerge(
						"-mx-(--gutter) relative overflow-x-auto whitespace-nowrap [--gutter-y:--spacing(2)] has-data-[slot=table-resizable-container]:overflow-auto",
						className,
					)}
				>
					<div
						className={twJoin("inline-block min-w-full align-middle", !bleed && "sm:px-(--gutter)")}
					>
						{allowResize ? (
							<ResizableTableContainer data-slot="table-resizable-container">
								<Root ref={ref} {...props} />
							</ResizableTableContainer>
						) : (
							<Root {...props} ref={ref} />
						)}
					</div>
				</div>
			</div>
		</TableContext>
	);
}

export function ColumnResizer({ className, ...props }: Readonly<ColumnResizerProps>): ReactNode {
	return (
		<ColumnResizerPrimitive
			{...props}
			className={cx(
				"absolute top-0 right-0 bottom-0 grid w-px touch-none place-content-center px-1 resizable-both:cursor-ew-resize &[data-resizable-direction=left]:cursor-e-resize &[data-resizable-direction=right]:cursor-w-resize [&[data-resizing]>div]:bg-primary",
				className,
			)}
		>
			<div className="h-full w-px bg-border py-(--gutter-y)" />
		</ColumnResizerPrimitive>
	);
}

export function TableBody<T extends object>(props: Readonly<TableBodyProps<T>>): ReactNode {
	return <TableBodyPrimitive data-slot="table-body" {...props} />;
}

export interface TableColumnProps extends ColumnProps {
	isResizable?: boolean;
}

export function TableColumn({
	isResizable = false,
	className,
	...props
}: Readonly<TableColumnProps>): ReactNode {
	const { bleed, grid } = useTableContext();
	
	return (
		<Column
			data-slot="table-column"
			{...props}
			className={cx(
				[
					"text-left font-medium text-muted-fg",
					"relative outline-hidden allows-sorting:cursor-default dragging:cursor-grabbing",
					"px-4 py-(--gutter-y)",
					"first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2))",
					!bleed && "sm:last:pr-1 sm:first:pl-1",
					grid && "border-l first:border-l-0",
					isResizable && "overflow-hidden truncate",
				],
				className,
			)}
		>
			{(values) => {
				return (
					<div className={twJoin(["inline-flex items-center gap-2 **:data-[slot=icon]:shrink-0"])}>
						{typeof props.children === "function" ? props.children(values) : props.children}
						{values.allowsSorting && (
							<span
								className={twJoin(
									"grid size-[1.15rem] flex-none shrink-0 place-content-center rounded-sm bg-secondary text-fg *:data-[slot=icon]:size-3.5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:transition-transform *:data-[slot=icon]:duration-200",
									values.isHovered ? "bg-secondary-fg/10" : "",
								)}
							>
								<ChevronDownIcon
									className={values.sortDirection === "ascending" ? "rotate-180" : ""}
								/>
							</span>
						)}
						{isResizable && <ColumnResizer />}
					</div>
				);
			}}
		</Column>
	);
}

export interface TableHeaderProps<T extends object> extends HeaderProps<T> {
	ref?: React.Ref<HTMLTableSectionElement>;
}

export function TableHeader<T extends object>({
	children,
	ref,
	columns,
	className,
	...props
}: Readonly<TableHeaderProps<T>>): ReactNode {
	const { bleed } = useTableContext();
	const { selectionBehavior, selectionMode, allowsDragging } = useTableOptions();

	return (
		<TableHeaderPrimitive
			ref={ref}
			className={cx("border-b", className)}
			data-slot="table-header"
			{...props}
		>
			{allowsDragging && (
				<Column
					className={twMerge(
						"first:pl-(--gutter,--spacing(2))",
						!bleed && "sm:last:pr-1 sm:first:pl-1",
					)}
					data-slot="table-column"
				/>
			)}
			{selectionBehavior === "toggle" && (
				<Column
					className={twMerge(
						"first:pl-(--gutter,--spacing(2))",
						!bleed && "sm:last:pr-1 sm:first:pl-1",
					)}
					data-slot="table-column"
				>
					{selectionMode === "multiple" && <Checkbox slot="selection" />}
				</Column>
			)}
			<Collection items={columns}>{children}</Collection>
		</TableHeaderPrimitive>
	);
}

export interface TableRowProps<T extends object> extends RowProps<T> {
	ref?: React.Ref<HTMLTableRowElement>;
}

export function TableRow<T extends object>({
	children,
	className,
	columns,
	id,
	ref,
	...props
}: Readonly<TableRowProps<T>>): ReactNode {
	const { selectionBehavior, allowsDragging } = useTableOptions();
	const { striped } = useTableContext();

	return (
		<Row
			ref={ref}
			data-slot="table-row"
			id={id}
			{...props}
			className={composeRenderProps(
				className,
				(
					className,
					{
						isSelected,
						selectionMode,
						isFocusVisibleWithin,
						isDragging,
						isDisabled,
						isFocusVisible,
					},
				) => {
					return twMerge(
						"group relative cursor-default text-muted-fg outline outline-transparent",
						isFocusVisible &&
							"bg-primary/5 outline-primary ring-3 ring-ring/20 hover:bg-primary/10",
						isDragging && "cursor-grabbing bg-primary/10 text-fg outline-primary",
						isSelected && "bg-(--table-selected-bg) text-fg hover:bg-(--table-selected-bg)/50",
						striped && "even:bg-muted",
						(props.href || props.onAction || selectionMode === "multiple") &&
							"hover:bg-(--table-selected-bg) hover:text-fg",
						(props.href || props.onAction || selectionMode === "multiple") &&
							isFocusVisibleWithin &&
							"bg-(--table-selected-bg)/50 text-fg selected:bg-(--table-selected-bg)/50",
						isDisabled && "opacity-50",
						className,
					);
				},
			)}
		>
			{allowsDragging && (
				<TableCell className="px-0">
					<Button
						className="grid place-content-center rounded-xs px-[calc(var(--gutter)/2)] outline-hidden focus-visible:ring focus-visible:ring-ring"
						slot="drag"
					>
						<svg
							aria-hidden={true}
							className="lucide lucide-grip-vertical-icon lucide-grip-vertical"
							data-slot="icon"
							fill="none"
							height={16}
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							viewBox="0 0 24 24"
							width={16}
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle cx={9} cy={12} r={1} />
							<circle cx={9} cy={5} r={1} />
							<circle cx={9} cy={19} r={1} />
							<circle cx={15} cy={12} r={1} />
							<circle cx={15} cy={5} r={1} />
							<circle cx={15} cy={19} r={1} />
						</svg>
					</Button>
				</TableCell>
			)}
			{selectionBehavior === "toggle" && (
				<TableCell className="px-0">
					<Checkbox slot="selection" />
				</TableCell>
			)}
			<Collection items={columns}>{children}</Collection>
		</Row>
	);
}

export interface TableCellProps extends CellProps {
	ref?: React.Ref<HTMLTableCellElement>;
}

export function TableCell({ className, ref, ...props }: Readonly<TableCellProps>): ReactNode {
	const { allowResize, bleed, grid, striped } = useTableContext();

	return (
		<Cell
			ref={ref}
			data-slot="table-cell"
			{...props}
			className={cx(
				twJoin(
					"group px-4 py-(--gutter-y) align-middle outline-hidden first:pl-(--gutter,--spacing(2)) last:pr-(--gutter,--spacing(2)) group-has-data-focus-visible-within:text-fg",
					!striped && "border-b",
					grid && "border-l first:border-l-0",
					!bleed && "sm:last:pr-1 sm:first:pl-1",
					allowResize && "overflow-hidden truncate",
				),
				className,
			)}
		/>
	);
}
