/* eslint-disable @typescript-eslint/strict-boolean-expressions */

import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function Card({ className, ...props }: Readonly<HTMLAttributes<HTMLDivElement>>): ReactNode {
	return (
		<div
			className={twMerge(
				"group/card flex flex-col gap-(--gutter) rounded-lg border py-(--gutter) text-fg shadow-xs [--gutter:--spacing(6)] **:data-[slot=table-header]:bg-muted/50 **:[table]:overflow-hidden has-[table]:overflow-hidden has-[table]:**:data-[slot=card-footer]:border-t has-[table]:not-has-data-[slot=card-footer]:pb-0",
				className,
			)}
			data-slot="card"
			{...props}
		/>
	);
}

export interface HeaderProps extends HTMLAttributes<HTMLDivElement> {
	title?: string;
	description?: string;
}

export function CardHeader({
	className,
	title,
	description,
	children,
	...props
}: Readonly<HeaderProps>): ReactNode {
	return (
		<div
			className={twMerge(
				"grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-(--gutter) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
				className,
			)}
			data-slot="card-header"
			{...props}
		>
			{title && <CardTitle>{title}</CardTitle>}
			{description && <CardDescription>{description}</CardDescription>}
			{!title && typeof children === "string" ? <CardTitle>{children}</CardTitle> : children}
		</div>
	);
}

export function CardTitle({ className, ...props }: Readonly<ComponentProps<"div">>): ReactNode {
	return (
		<div
			className={twMerge("text-balance font-semibold text-base/6", className)}
			data-slot="card-title"
			{...props}
		/>
	);
}

export function CardDescription({
	className,
	...props
}: Readonly<HTMLAttributes<HTMLDivElement>>): ReactNode {
	return (
		<div
			{...props}
			className={twMerge("row-start-2 text-pretty text-muted-fg text-sm/6", className)}
			data-slot="card-description"
			{...props}
		/>
	);
}

export function CardAction({
	className,
	...props
}: Readonly<HTMLAttributes<HTMLDivElement>>): ReactNode {
	return (
		<div
			className={twMerge(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end",
				className,
			)}
			data-slot="card-action"
			{...props}
		/>
	);
}

export function CardContent({
	className,
	...props
}: Readonly<HTMLAttributes<HTMLDivElement>>): ReactNode {
	return (
		<div
			className={twMerge("px-(--gutter) has-[table]:border-t", className)}
			data-slot="card-content"
			{...props}
		/>
	);
}

export function CardFooter({
	className,
	...props
}: Readonly<HTMLAttributes<HTMLDivElement>>): ReactNode {
	return (
		<div
			className={twMerge(
				"flex items-center px-(--gutter) group-has-[table]/card:pt-(--gutter) [.border-t]:pt-6",
				className,
			)}
			data-slot="card-footer"
			{...props}
		/>
	);
}
