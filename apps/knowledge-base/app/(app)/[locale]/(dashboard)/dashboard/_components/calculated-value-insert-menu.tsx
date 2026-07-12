"use client";

import {
	calculatedValueKindLabels,
	calculatedValueKindsEnum,
} from "@dariah-eric/database/calculated-values";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@dariah-eric/ui/menu";
import { VariableIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { Button as AriaButton } from "react-aria-components";

interface CalculatedValueInsertMenuProps {
	onInsert: (value: { kind: string; label: string }) => void;
}

/**
 * Toolbar menu for the rich text editor that inserts a `calculatedValue` inline node. The node
 * stores only the kind reference; read paths substitute the current value, so content like "the
 * number of member countries" never goes out of sync with the database.
 */
export function CalculatedValueInsertMenu({
	onInsert,
}: Readonly<CalculatedValueInsertMenuProps>): ReactNode {
	return (
		<Menu>
			<AriaButton
				aria-label="Insert calculated value"
				className="relative inline-flex block-8 inline-8 items-center justify-center rounded-md transition-colors text-muted-fg hover:text-fg focus:outline-none focus:ring-2 focus:ring-ring"
			>
				<VariableIcon className="block-4 inline-4" />
			</AriaButton>
			<MenuContent className="min-inline-60" placement="bottom">
				{calculatedValueKindsEnum.map((kind) => (
					<MenuItem
						key={kind}
						onAction={() => {
							onInsert({ kind, label: calculatedValueKindLabels[kind] });
						}}
					>
						<MenuLabel>{calculatedValueKindLabels[kind]}</MenuLabel>
					</MenuItem>
				))}
			</MenuContent>
		</Menu>
	);
}
