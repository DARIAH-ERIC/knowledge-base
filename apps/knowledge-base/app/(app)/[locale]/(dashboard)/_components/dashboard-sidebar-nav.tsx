/* eslint-disable react/jsx-no-literals */

import {
	ArrowLeftStartOnRectangleIcon,
	Cog6ToothIcon,
	DocumentTextIcon,
	Squares2X2Icon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
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
import { SidebarNav, SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardSidebarNav(): ReactNode {
	return (
		<SidebarNav>
			<span className="flex items-center gap-x-4">
				<SidebarTrigger />
				<Breadcrumbs className="hidden md:flex">
					<BreadcrumbsItem href="/dashboard">Dashboard</BreadcrumbsItem>
					<BreadcrumbsItem>Overview</BreadcrumbsItem>
				</Breadcrumbs>
			</span>
			<UserMenu />
		</SidebarNav>
	);
}

function UserMenu(): ReactNode {
	return (
		<Menu>
			<MenuTrigger aria-label="Open Menu" className="ml-auto md:hidden">
				<Avatar isSquare={true} src="https://avatars.githubusercontent.com/u/20753323" />
			</MenuTrigger>

			<MenuContent className="min-w-64" popover={{ placement: "bottom end" }}>
				<MenuSection>
					<MenuHeader separator={true}>
						<span className="block">Stefan Probst</span>
						<span className="font-normal text-muted-fg">stefan.probst@oeaw.ac.at</span>
					</MenuHeader>
				</MenuSection>

				<MenuItem href="#dashboard">
					<Squares2X2Icon />
					<MenuLabel>Dashboard</MenuLabel>
				</MenuItem>

				<MenuItem href="#account">
					<Cog6ToothIcon />
					<MenuLabel>Account</MenuLabel>
				</MenuItem>

				<MenuSeparator />

				<MenuItem href="#documentation">
					<DocumentTextIcon />
					<MenuLabel>Documentation</MenuLabel>
				</MenuItem>

				<MenuSeparator />

				<MenuItem href="#sign-out">
					<ArrowLeftStartOnRectangleIcon />
					<MenuLabel>Sign out</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	);
}
