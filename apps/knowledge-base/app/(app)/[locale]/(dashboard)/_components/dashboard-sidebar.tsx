/* eslint-disable react/jsx-no-literals */

import { EllipsisHorizontalIcon } from "@heroicons/react/16/solid";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
import {
	ArrowLeftStartOnRectangleIcon,
	BriefcaseIcon,
	BuildingOfficeIcon,
	ChatBubbleLeftRightIcon,
	Cog6ToothIcon,
	DocumentTextIcon,
	EnvelopeIcon,
	HomeIcon,
	QuestionMarkCircleIcon,
	TicketIcon,
	UserCircleIcon,
	UserGroupIcon,
} from "@heroicons/react/24/solid";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/ui/link";
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
import {
	Sidebar,
	SidebarContent,
	SidebarDisclosure,
	SidebarDisclosureGroup,
	SidebarDisclosurePanel,
	SidebarDisclosureTrigger,
	SidebarFooter,
	SidebarHeader,
	SidebarItem,
	SidebarLabel,
	SidebarRail,
	type SidebarProps
} from "@/components/ui/sidebar";

export function DashboardSidebar(props: Readonly<SidebarProps>): ReactNode {
	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<Link className="flex items-center gap-x-2" href="/docs/components/layouts/sidebar">
					<Avatar
						className="outline-hidden dark:invert"
						isSquare={true}
						size="sm"
						src="/assets/images/logo-dariah.svg"
					/>
					<SidebarLabel className="font-medium">DARIAH-EU</SidebarLabel>
				</Link>
			</SidebarHeader>

			<SidebarContent>
				<SidebarDisclosureGroup allowsMultipleExpanded={false}>
					<SidebarDisclosure id={1}>
						<SidebarDisclosureTrigger>
							<EllipsisHorizontalIcon />
							<SidebarLabel>Administrator</SidebarLabel>
						</SidebarDisclosureTrigger>

						<SidebarDisclosurePanel>
							<SidebarItem href="/dashboard/administrator" tooltip="Overview">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Overview</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/contributions" tooltip="Contributions">
								<ChatBubbleLeftRightIcon />
								<SidebarLabel>Contributions</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/countries" tooltip="Countries">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Countries</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/institutions" tooltip="Institutions">
								<BuildingOfficeIcon />
								<SidebarLabel>Institutions</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/outreach" tooltip="Outreach">
								<EnvelopeIcon />
								<SidebarLabel>Outreach</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/persons" tooltip="Persons">
								<UserGroupIcon />
								<SidebarLabel>Persons</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/projects" tooltip="Projects">
								<BriefcaseIcon />
								<SidebarLabel>Projects</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/reports" tooltip="Reports">
								<TicketIcon />
								<SidebarLabel>Reports</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/services" tooltip="Services">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Services</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/software" tooltip="Software">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Software</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/users" tooltip="Users">
								<UserCircleIcon />
								<SidebarLabel>Users</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/administrator/working-groups" tooltip="Working groups">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Working groups</SidebarLabel>
							</SidebarItem>
						</SidebarDisclosurePanel>
					</SidebarDisclosure>

					<SidebarDisclosure id={2}>
						<SidebarDisclosureTrigger>
							<EllipsisHorizontalIcon />
							<SidebarLabel>National consortium</SidebarLabel>
						</SidebarDisclosureTrigger>

						<SidebarDisclosurePanel>
							<SidebarItem href="/dashboard/national-consortia/at" tooltip="Austria">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Austria</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/national-consortia/at/reports" tooltip="Reports">
								<TicketIcon />
								<SidebarLabel>Reports</SidebarLabel>
							</SidebarItem>

							<SidebarItem
								href="/dashboard/national-consortia/at/reports/2025"
								tooltip="Current report"
							>
								<TicketIcon />
								<SidebarLabel>Current report</SidebarLabel>
							</SidebarItem>
						</SidebarDisclosurePanel>
					</SidebarDisclosure>

					<SidebarDisclosure id={3}>
						<SidebarDisclosureTrigger>
							<EllipsisHorizontalIcon />
							<SidebarLabel>Working groups</SidebarLabel>
						</SidebarDisclosureTrigger>

						<SidebarDisclosurePanel>
							<SidebarItem
								href="/dashboard/working-groups/bibliographic-data"
								tooltip="WG Bibliographic data"
							>
								<QuestionMarkCircleIcon />
								<SidebarLabel>WG Bibliographic data</SidebarLabel>
							</SidebarItem>

							<SidebarItem
								href="/dashboard/working-groups/bibliographic-data/reports"
								tooltip="Reports"
							>
								<TicketIcon />
								<SidebarLabel>Reports</SidebarLabel>
							</SidebarItem>

							<SidebarItem
								href="/dashboard/working-groups/bibliographic-data/reports/2025"
								tooltip="Current report"
							>
								<TicketIcon />
								<SidebarLabel>Current report</SidebarLabel>
							</SidebarItem>
						</SidebarDisclosurePanel>
					</SidebarDisclosure>

					<SidebarDisclosure id={4}>
						<SidebarDisclosureTrigger>
							<EllipsisHorizontalIcon />
							<SidebarLabel>Website</SidebarLabel>
						</SidebarDisclosureTrigger>

						<SidebarDisclosurePanel>
							<SidebarItem href="/dashboard/website" tooltip="Overview">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Overview</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/website/metadata" tooltip="Metadata">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Metadata</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/website/pages" tooltip="Pages">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Pages</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/website/events" tooltip="Events">
								<QuestionMarkCircleIcon />
								<SidebarLabel>Events</SidebarLabel>
							</SidebarItem>

							<SidebarItem href="/dashboard/website/news" tooltip="News">
								<QuestionMarkCircleIcon />
								<SidebarLabel>News</SidebarLabel>
							</SidebarItem>

							<SidebarItem
								href="/dashboard/website/impact-case-studies"
								tooltip="Impact case studies"
							>
								<QuestionMarkCircleIcon />
								<SidebarLabel>Impact case studies</SidebarLabel>
							</SidebarItem>
						</SidebarDisclosurePanel>
					</SidebarDisclosure>
				</SidebarDisclosureGroup>
			</SidebarContent>

			<SidebarFooter className="flex flex-row justify-between gap-4 group-data-[state=collapsed]:flex-col">
				<Menu>
					<MenuTrigger aria-label="Profile" className="flex w-full items-center justify-between">
						<div className="flex items-center gap-x-2">
							<Avatar
								className="size-8 *:size-8 group-data-[state=collapsed]:size-6 group-data-[state=collapsed]:*:size-6"
								isSquare={true}
								src="https://avatars.githubusercontent.com/u/20753323"
							/>
							<div className="text-sm in-data-[collapsible=dock]:hidden">
								<SidebarLabel>Stefan Probst</SidebarLabel>
								<span className="-mt-0.5 block truncate text-muted-fg">
									stefan.probst@oeaw.ac.at
								</span>
							</div>
						</div>
						<ChevronUpDownIcon className="shrink-0" data-slot="chevron" />
					</MenuTrigger>

					<MenuContent
						className="min-w-(--trigger-width) in-data-[sidebar-collapsible=collapsed]:min-w-56"
						placement="bottom right"
					>
						<MenuSection>
							<MenuHeader separator={true}>
								<span className="block">Stefan Probst</span>
								<span className="font-normal text-muted-fg">stefan.probst@oeaw.ac.at</span>
							</MenuHeader>
						</MenuSection>

						<MenuItem href="#dashboard">
							<HomeIcon />
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
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
