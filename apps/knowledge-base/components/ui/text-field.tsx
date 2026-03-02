/* eslint-disable @eslint-react/prefer-read-only-props */

"use client";

import type { ReactNode } from "react";
import { TextField as TextFieldPrimitive, type TextFieldProps } from "react-aria-components";

import { cx } from "@/components/ui/cx";

import { fieldStyles } from "./field";

export function TextField({ className, ...props }: TextFieldProps): ReactNode {
	return (
		<TextFieldPrimitive className={cx(fieldStyles(), className)} data-slot="control" {...props} />
	);
}
