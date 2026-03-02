/* eslint-disable react/jsx-no-literals */

"use client";

import {
	ArrowLeftStartOnRectangleIcon,
	Cog6ToothIcon,
	DocumentTextIcon,
	Squares2X2Icon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import {
	Menu,
	MenuContent,
	MenuHeader,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from "@/components/ui/menu";

interface UserMenuProps {
	user: {
		name: string;
		email: string;
	};
}

export function UserMenu(props: Readonly<UserMenuProps>): ReactNode {
	const { user } = props;

	return (
		<Menu>
			<MenuTrigger aria-label="Open Menu" className="ml-auto md:hidden">
				<Avatar isSquare={true} src="https://avatars.githubusercontent.com/u/20753323" />
			</MenuTrigger>

			<MenuContent className="min-w-64" popover={{ placement: "bottom end" }}>
				<MenuSection>
					<MenuHeader separator={true}>
						<span className="block">{user.name}</span>
						<span className="font-normal text-muted-fg">{user.email}</span>
					</MenuHeader>
				</MenuSection>

				<MenuItem href="/dashboard">
					<Squares2X2Icon />
					<MenuLabel>Dashboard</MenuLabel>
				</MenuItem>

				<MenuItem href="/auth/settings">
					<Cog6ToothIcon />
					<MenuLabel>Settings</MenuLabel>
				</MenuItem>

				<MenuSeparator />

				<MenuItem href="/documentation">
					<DocumentTextIcon />
					<MenuLabel>Documentation</MenuLabel>
				</MenuItem>

				<MenuSeparator />

				<MenuItem
					onAction={() => {
						// TODO:
					}}
				>
					<ArrowLeftStartOnRectangleIcon />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	);
}
