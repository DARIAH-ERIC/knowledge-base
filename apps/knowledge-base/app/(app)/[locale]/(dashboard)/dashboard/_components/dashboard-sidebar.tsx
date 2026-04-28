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

interface SidebarMenuItem {
	href: string;
	tooltip: string;
	label: string;
	icon: ReactNode;
}

interface SidebarMenuSection {
	title: string;
	items: Array<SidebarMenuItem>;
}

export function useSidebarMenu(isAdmin: boolean): Array<SidebarMenuSection> {
	const t = useExtracted();

	const adminSection: SidebarMenuSection = {
		title: t("Administrator"),
		items: [
			{
				href: "/dashboard/administrator",
				tooltip: t("Overview"),
				label: t("Overview"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/contributions",
				tooltip: t("Contributions"),
				label: t("Contributions"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/countries",
				tooltip: t("Countries"),
				label: t("Countries"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/governance-bodies",
				tooltip: t("Governance bodies"),
				label: t("Governance bodies"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/institutions",
				tooltip: t("Institutions"),
				label: t("Institutions"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/national-consortia",
				tooltip: t("National consortia"),
				label: t("National consortia"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/newsletters",
				tooltip: t("Newsletters"),
				label: t("Newsletters"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/persons",
				tooltip: t("Persons"),
				label: t("Persons"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/projects",
				tooltip: t("Projects"),
				label: t("Projects"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/reporting-campaigns",
				tooltip: t("Reporting campaigns"),
				label: t("Reporting campaigns"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/country-reports",
				tooltip: t("Country reports"),
				label: t("Country reports"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/working-group-reports",
				tooltip: t("Working group reports"),
				label: t("Working group reports"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/services",
				tooltip: t("Services"),
				label: t("Services"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/social-media",
				tooltip: t("Social media"),
				label: t("Social media"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/users",
				tooltip: t("Users"),
				label: t("Users"),
				icon: <ListBulletIcon />,
			},
			{
				href: "/dashboard/administrator/working-groups",
				tooltip: t("Working groups"),
				label: t("Working groups"),
				icon: <ListBulletIcon />,
			},
		],
	};

	return [
		...(isAdmin ? [adminSection] : []),
		{
			title: t("Reports"),
			items: [
				{
					href: "/dashboard/reporting",
					tooltip: t("Overview"),
					label: t("Overview"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/reporting/country-reports",
					tooltip: t("Country reports"),
					label: t("Country reports"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/reporting/working-group-reports",
					tooltip: t("Working group reports"),
					label: t("Working group reports"),
					icon: <ListBulletIcon />,
				},
			],
		},
		{
			title: t("Website"),
			items: [
				{
					href: "/dashboard/website",
					tooltip: t("Overview"),
					label: t("Overview"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/assets",
					tooltip: t("Assets"),
					label: t("Assets"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/documents-policies",
					tooltip: t("Documents and policies"),
					label: t("Documents and policies"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/events",
					tooltip: t("Events"),
					label: t("Events"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/funding-calls",
					tooltip: t("Funding Calls"),
					label: t("Funding Calls"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/impact-case-studies",
					tooltip: t("Impact case studies"),
					label: t("Impact case studies"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/metadata",
					tooltip: t("Metadata"),
					label: t("Metadata"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/navigation",
					tooltip: t("Navigation"),
					label: t("Navigation"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/news",
					tooltip: t("News"),
					label: t("News"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/opportunities",
					tooltip: t("Opportunities"),
					label: t("Opportunities"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/pages",
					tooltip: t("Pages"),
					label: t("Pages"),
					icon: <ListBulletIcon />,
				},
				{
					href: "/dashboard/website/spotlight-articles",
					tooltip: t("Spotlight articles"),
					label: t("Spotlight articles"),
					icon: <ListBulletIcon />,
				},
			],
		},
	] satisfies Array<SidebarMenuSection>;
}

function getCurrentSidebarHref(
	pathname: string,
	sidebarMenu: Array<SidebarMenuSection>,
): string | undefined {
	const hrefs = [
		"/dashboard",
		...sidebarMenu.flatMap((section) => {
			return section.items.map((item) => {
				return item.href;
			});
		}),
	];

	return hrefs.reduce<string | undefined>((currentHref, href) => {
		const isMatch = pathname === href || pathname.startsWith(`${href}/`);

		if (!isMatch) {
			return currentHref;
		}

		if (currentHref == null || href.length > currentHref.length) {
			return href;
		}

		return currentHref;
	}, undefined);
}

interface DashboardSidebarProps extends SidebarProps {
	isAdmin: boolean;
}

export function DashboardSidebar(props: Readonly<DashboardSidebarProps>): ReactNode {
	const { isAdmin, ...sidebarProps } = props;
	const { state, isMobile, setIsOpenOnMobile } = useSidebar();
	const [isCmdOpen, setIsCmdOpen] = useState(false);
	const pathname = usePathname();
	const sidebarMenu = useSidebarMenu(isAdmin);
	const currentHref = getCurrentSidebarHref(pathname, sidebarMenu);
	const meta = useMetadata();
	const t = useExtracted();

	useEffect(() => {
		setIsOpenOnMobile(false);
	}, [pathname, setIsOpenOnMobile]);

	return (
		<Sidebar {...sidebarProps}>
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
							<CommandPalette isAdmin={isAdmin} isOpen={isCmdOpen} setIsOpen={setIsCmdOpen} />
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
						<SidebarItem
							href="/dashboard"
							isCurrent={currentHref === "/dashboard"}
							tooltip={t("Dashboard")}
						>
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
										<SidebarItem
											// eslint-disable-next-line @eslint-react/no-array-index-key
											key={index}
											href={item.href}
											isCurrent={currentHref === item.href}
											tooltip={item.tooltip}
										>
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

	const current = isCurrent ?? pathname === href;

	return <SidebarItemBase {...rest} href={href} isCurrent={current} />;
}
