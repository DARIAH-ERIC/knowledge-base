"use client";

import {
	CommandMenu,
	CommandMenuItem,
	CommandMenuLabel,
	CommandMenuList,
	CommandMenuSearch,
	CommandMenuSection,
} from "@dariah-eric/ui/command-menu";
import { useExtracted } from "next-intl";
import { type ReactNode, useState } from "react";

import { useSidebarMenu } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/dashboard-sidebar";
import { useRouter } from "@/lib/navigation/navigation";

interface CommandPaletteProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
}

export function CommandPalette(props: Readonly<CommandPaletteProps>): ReactNode {
	const { isOpen, setIsOpen } = props;

	const t = useExtracted();
	const sidebarMenu = useSidebarMenu();

	const [searchInput, setSearchInput] = useState("");

	const router = useRouter();

	function navigate(url: string) {
		router.push(url, { scroll: false });

		setIsOpen(false);
	}

	return (
		<CommandMenu
			inputValue={searchInput}
			isOpen={isOpen}
			onInputChange={setSearchInput}
			onOpenChange={setIsOpen}
			shortcut="k"
		>
			<CommandMenuSearch placeholder={t("Quick search...")} />
			<CommandMenuList>
				{sidebarMenu.map((section, index) => {
					return (
						// eslint-disable-next-line @eslint-react/no-array-index-key
						<CommandMenuSection key={index} label={section.title}>
							{section.items.map((item, index) => {
								return (
									<CommandMenuItem
										// eslint-disable-next-line @eslint-react/no-array-index-key
										key={index}
										onAction={() => {
											navigate(item.href);
										}}
										textValue={item.tooltip}
									>
										{item.icon}
										<CommandMenuLabel>{item.label}</CommandMenuLabel>
									</CommandMenuItem>
								);
							})}
						</CommandMenuSection>
					);
				})}
			</CommandMenuList>
		</CommandMenu>
	);
}
