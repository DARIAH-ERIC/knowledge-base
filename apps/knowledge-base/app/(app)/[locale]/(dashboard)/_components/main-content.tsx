import type { ComponentProps, ReactNode } from "react";

import { Main } from "@/components/main";

export const mainContentId = "main-content";

interface MainContentProps extends Omit<ComponentProps<typeof Main>, "id"> {
	children: ReactNode;
}

export function MainContent(props: Readonly<MainContentProps>): ReactNode {
	const { children, ...rest } = props;

	return (
		<Main {...rest} id={mainContentId}>
			{children}
		</Main>
	);
}
