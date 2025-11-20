/* eslint-disable @eslint-react/prefer-read-only-props */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

"use client";

import type { RefObject } from "react";
import { Link as LinkPrimitive, type LinkProps as LinkPrimitiveProps } from "react-aria-components";

import { cx } from "@/components/ui/cx";

interface LinkProps extends LinkPrimitiveProps {
	ref?: RefObject<HTMLAnchorElement>;
}

function Link({ className, ref, ...props }: LinkProps) {
	return (
		<LinkPrimitive
			ref={ref}
			className={cx(
				[
					"font-medium text-(--text)",
					"outline-0 outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring forced-colors:outline-[Highlight]",
					"disabled:cursor-default disabled:text-muted-fg forced-colors:disabled:text-[GrayText]",
					"href" in props && "cursor-pointer",
				],
				className,
			)}
			{...props}
		/>
	);
}

export type { LinkProps };

export { Link };
