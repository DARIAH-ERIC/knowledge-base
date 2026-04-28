"use client";

import type { User } from "@dariah-eric/auth";
import { Avatar } from "@dariah-eric/ui/avatar";
import { Button } from "@dariah-eric/ui/button";
import {
	Menu,
	MenuContent,
	MenuHeader,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuTrigger,
} from "@dariah-eric/ui/menu";
import { Separator } from "@dariah-eric/ui/separator";
import { SidebarNav, SidebarTrigger, useSidebar } from "@dariah-eric/ui/sidebar";
import { Switch } from "@dariah-eric/ui/switch";
import {
	ArrowLeftStartOnRectangleIcon as IconLogout,
	Cog6ToothIcon as IconSettings,
	CommandLineIcon as IconCommandRegular,
	MagnifyingGlassIcon as IconSearch,
	MoonIcon as IconMoon,
	Squares2X2Icon as IconDashboard,
	SunIcon as IconSun,
} from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useState } from "react";

import { CommandPalette } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/command-palette";
import { signOutAction } from "@/lib/auth/sign-out.action";
import { useColorScheme } from "@/lib/color-scheme/use-color-scheme";

interface DashboardSidebarNavProps {
	isAdmin: boolean;
	breadcrumbs: ReactNode;
	user: User;
}

export function DashboardSidebarNav(props: Readonly<DashboardSidebarNavProps>): ReactNode {
	const { isAdmin, breadcrumbs, user } = props;

	const { isMobile } = useSidebar();
	const [isCmdOpen, setIsCmdOpen] = useState(false);

	const t = useExtracted();

	return (
		<SidebarNav className="border-b bg-sidebar">
			<span className="flex items-center gap-x-4">
				<SidebarTrigger className="-mx-2" />
				<Separator className="h-6" orientation="vertical" />
				{breadcrumbs}
			</span>
			<div className="ml-auto flex items-center gap-x-2">
				{isMobile ? (
					<Fragment>
						<Button
							aria-label={t("Open command menu")}
							intent="plain"
							isCircle={true}
							onPress={() => {
								setIsCmdOpen(true);
							}}
							size="sq-sm"
						>
							<IconSearch />
						</Button>
						<CommandPalette isAdmin={isAdmin} isOpen={isCmdOpen} setIsOpen={setIsCmdOpen} />
					</Fragment>
				) : null}
				<UserMenu user={user} />
			</div>
		</SidebarNav>
	);
}

interface UserMenuProps {
	user: User;
}

function UserMenu(props: Readonly<UserMenuProps>): ReactNode {
	const { user } = props;

	const { colorScheme, setColorScheme } = useColorScheme();

	const t = useExtracted();

	return (
		<Menu>
			<MenuTrigger aria-label={t("Open menu")}>
				<Avatar alt={user.name} initials={user.name.at(0)} />
			</MenuTrigger>
			<MenuContent className="min-w-60" placement="bottom">
				<MenuSection>
					<MenuHeader separator={true}>
						<span className="block">{user.name}</span>
						<span className="font-normal text-muted-fg">{user.email}</span>
					</MenuHeader>
				</MenuSection>
				<MenuItem href="/dashboard">
					<IconDashboard />
					<MenuLabel>{t("Dashboard")}</MenuLabel>
				</MenuItem>
				<MenuItem href="/dashboard/settings">
					<IconSettings />
					<MenuLabel>{t("Settings")}</MenuLabel>
				</MenuItem>
				<MenuSeparator />
				<MenuItem>
					<IconCommandRegular />
					<MenuLabel>{t("Command menu")}</MenuLabel>
				</MenuItem>
				<MenuItem className="[&>[slot=label]+[data-slot=icon]]:top-1.5 [&>[slot=label]+[data-slot=icon]]:right-11">
					{colorScheme === "dark" ? <IconMoon /> : <IconSun />}
					<MenuLabel>{t("Color scheme")}</MenuLabel>
					<span data-slot="icon">
						<Switch
							aria-label={t("Toggle color scheme")}
							className="ml-auto"
							isSelected={colorScheme === "dark"}
							onChange={() => {
								setColorScheme(colorScheme === "dark" ? "light" : "dark");
							}}
						/>
					</span>
				</MenuItem>
				<MenuSeparator />
				<MenuItem href="/documentation">
					<MenuLabel>{t("Documentation")}</MenuLabel>
				</MenuItem>
				<MenuSeparator />
				<MenuItem
					onAction={() => {
						void signOutAction();
					}}
				>
					<IconLogout />
					<MenuLabel>{t("Sign out")}</MenuLabel>
				</MenuItem>
			</MenuContent>
		</Menu>
	);
}
