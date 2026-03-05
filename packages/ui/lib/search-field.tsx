"use client";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import type { InputProps, SearchFieldProps } from "react-aria-components";
import { Button as AriaButton, SearchField as AriaSearchField } from "react-aria-components";
import { twJoin } from "tailwind-merge";
import { fieldStyles } from "@/lib/field";
import { cx } from "@/lib/primitive";
import { Input, InputGroup } from "@/lib/input";
import type { ReactNode } from "react";

export function SearchField({ className, ...props }: SearchFieldProps): ReactNode {
	return (
		<AriaSearchField
			{...props}
			aria-label={props["aria-label"] ?? "Search"}
			className={cx(fieldStyles({ className: "group/search-field" }), className)}
		/>
	);
}

export function SearchInput(props: Readonly<InputProps>): ReactNode {
	return (
		<InputGroup className="[--input-gutter-end:--spacing(8)]">
			<MagnifyingGlassIcon />
			<Input {...props} />
			<AriaButton
				aria-label="Clear search"
				className={twJoin(
					"touch-target grid place-content-center pressed:text-fg text-muted-fg hover:text-fg group-empty/search-field:invisible",
					"px-3 py-2 sm:px-2.5 sm:py-1.5 sm:text-sm/5",
				)}
			>
				<XMarkIcon className="size-5 sm:size-4" />
			</AriaButton>
		</InputGroup>
	);
}
