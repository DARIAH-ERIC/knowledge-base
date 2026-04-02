"use client";

import { Button } from "@dariah-eric/ui/button";
import { Keyboard } from "@dariah-eric/ui/keyboard";
import { Link } from "@dariah-eric/ui/link";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarItem as SidebarItemBase,
	type SidebarItemProps as SidebarItemBaseProps,
	SidebarLabel,
	type SidebarProps,
	SidebarRail,
	SidebarSection,
	SidebarSectionGroup,
	useSidebar,
} from "@dariah-eric/ui/sidebar";
import { ListBulletIcon, MagnifyingGlassIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import cn from "clsx/lite";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useEffect, useState } from "react";

import { CommandPalette } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/command-palette";
import { Logo } from "@/components/logo";
import { useMetadata } from "@/lib/i18n/metadata";
import { usePathname } from "@/lib/navigation/navigation";

export const sidebarMenu = [
	{
		title: "Administrator",
		items: [
			{
				href: "/dashboard/administrator",
				tooltip: "Overview",
				label: "Overview",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/contributions",
				tooltip: "Contributions",
				label: "Contributions",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/institutions",
				tooltip: "Institutions",
				label: "Institutions",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/national-consortia",
				tooltip: "National consortia",
				label: "National consortia",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/newsletters",
				tooltip: "Newsletters",
				label: "Newsletters",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/persons",
				tooltip: "Persons",
				label: "Persons",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/projects",
				tooltip: "Projects",
				label: "Projects",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/services",
				tooltip: "Services",
				label: "Services",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/social-media",
				tooltip: "Social media",
				label: "Social media",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/software",
				tooltip: "Software",
				label: "Software",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/users",
				tooltip: "Users",
				label: "Users",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/working-groups",
				tooltip: "Working groups",
				label: "Working groups",
				icon: <ListBulletIcon />,
			},
		],
	},
	{
		title: "Reports",
		items: [
			{
				href: "/dashboard/administrator/reports",
				tooltip: "National consortia reports",
				label: "National consortia reports",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/working-group-reports",
				tooltip: "Working groups reports",
				label: "Working groups reports",
				icon: <ListBulletIcon />,
			},
		],
	},
	{
		title: "Website",
		items: [
			{
				href: "/dashboard/website",
				tooltip: "Overview",
				label: "Overview",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/assets",
				tooltip: "Assets",
				label: "Assets",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/documents-policies",
				tooltip: "Documents and policies",
				label: "Documents and policies",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/events",
				tooltip: "Events",
				label: "Events",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/impact-case-studies",
				tooltip: "Impact case studies",
				label: "Impact case studies",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/metadata",
				tooltip: "Metadata",
				label: "Metadata",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/navigation",
				tooltip: "Navigation",
				label: "Navigation",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/news",
				tooltip: "News",
				label: "News",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/pages",
				tooltip: "Pages",
				label: "Pages",
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/website/spotlight-articles",
				tooltip: "Spotlight articles",
				label: "Spotlight articles",
				icon: <ListBulletIcon />,
			},
		],
	},
];

interface DashboardSidebarProps extends SidebarProps {}

export function DashboardSidebar(props: Readonly<DashboardSidebarProps>): ReactNode {
	const { state, isMobile, setIsOpenOnMobile } = useSidebar();
	const [isCmdOpen, setIsCmdOpen] = useState(false);
	const pathname = usePathname();
	const meta = useMetadata();
	const t = useExtracted();

	useEffect(() => {
		setIsOpenOnMobile(false);
	}, [pathname, setIsOpenOnMobile]);

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<Link
					className="flex items-center gap-x-2 group-data-[collapsible=dock]:size-8 group-data-[collapsible=dock]:items-center group-data-[collapsible=dock]:justify-center"
					href="/dashboard"
				>
					<Logo className="size-5" />
					<SidebarLabel className="font-medium">{meta.title}</SidebarLabel>
				</Link>
			</SidebarHeader>
			<SidebarContent>
				<SidebarSectionGroup className="pb-4">
					{!isMobile ? (
						<Fragment>
							<CommandPalette isOpen={isCmdOpen} setIsOpen={setIsCmdOpen} />
							<div className="px-4 pt-2">
								<Button
									aria-label={t("Open quick search")}
									className={cn(
										"group",
										state === "expanded" &&
											"bg-bg sm:w-full sm:justify-between dark:bg-secondary/50",
									)}
									intent={state === "expanded" ? "outline" : "plain"}
									onPress={() => {
										setIsCmdOpen(true);
									}}
									size={state === "expanded" ? "md" : "sq-md"}
								>
									{state === "expanded" ? (
										<Fragment>
											<span className="flex items-center gap-x-2">
												<MagnifyingGlassIcon className="size-5 sm:size-4" />
												<span className="truncate text-muted-fg group-hover:text-fg">
													{t("Quick search...")}
												</span>
											</span>
											<Keyboard>{"⌘+k"}</Keyboard>
										</Fragment>
									) : (
										<MagnifyingGlassIcon />
									)}
								</Button>
							</div>
						</Fragment>
					) : null}
					<SidebarSection label={t("Overview")}>
						<SidebarItem href="/dashboard" tooltip="Dashboard">
							<Squares2X2Icon />
							<SidebarLabel>{t("Dashboard")}</SidebarLabel>
						</SidebarItem>
					</SidebarSection>

					{sidebarMenu.map((section, index) => {
						return (
							// eslint-disable-next-line @eslint-react/no-array-index-key
							<SidebarSection key={index} label={section.title}>
								{section.items.map((item, index) => {
									return (
										// eslint-disable-next-line @eslint-react/no-array-index-key
										<SidebarItem key={index} href={item.href} tooltip={item.tooltip}>
											{item.icon}
											<SidebarLabel>{item.label}</SidebarLabel>
										</SidebarItem>
									);
								})}
							</SidebarSection>
						);
					})}
				</SidebarSectionGroup>
			</SidebarContent>

			<SidebarFooter
				className={state === "collapsed" ? "p-4" : "border-t px-4 py-2.5"}
			></SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}

interface SidebarItemProps extends SidebarItemBaseProps {
	href: string;
}

function SidebarItem(props: Readonly<SidebarItemProps>): ReactNode {
	const { href, isCurrent, ...rest } = props;

	const pathname = usePathname();

	const current = isCurrent === true || pathname === href || pathname.startsWith(`${href}/`);

	return <SidebarItemBase {...rest} href={href} isCurrent={current} />;
}
