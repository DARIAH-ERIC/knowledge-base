/* eslint-disable react/jsx-no-literals */

"use client";

import { buttonStyles } from "@dariah-eric/ui/button";
import { Link, type LinkProps } from "@dariah-eric/ui/link";
import { PencilSquareIcon as IconHighlight } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

interface EditActionProps extends Omit<LinkProps, "children"> {}

export function EditAction({ href, ...props }: Readonly<EditActionProps>): ReactNode {
	return (
		<Link href={href} {...props} className={buttonStyles({ intent: "secondary" })}>
			<IconHighlight />
			Edit
		</Link>
	);
}
