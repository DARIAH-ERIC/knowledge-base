"use client";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import type { ReactNode } from "react";

import type { ColorScheme } from "@/lib/color-scheme/color-scheme-script";
import { useColorScheme } from "@/lib/color-scheme/use-color-scheme";

interface ColorSchemeSelectProps {
	items: Record<ColorScheme | "system", string>;
	label: string;
}

export function ColorSchemeSelect(props: Readonly<ColorSchemeSelectProps>): ReactNode {
	const { items, label } = props;

	const { kind, colorScheme, setColorScheme } = useColorScheme();

	if (kind === "server") {
		return <div />;
	}

	const value = kind === "system" ? "system" : colorScheme;

	return (
		<Select
			aria-label={label}
			onChange={(value) => {
				const colorScheme = value as keyof typeof items;
				setColorScheme(colorScheme === "system" ? null : colorScheme);
			}}
			value={value}
		>
			<SelectTrigger />
			<SelectContent>
				{Object.entries(items).map(([value, label]) => {
					return (
						<SelectItem key={value} id={value}>
							{label}
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
