"use client";

import { type ReactNode, useLayoutEffect } from "react";

interface ColorSchemeProviderProps {
	children?: ReactNode;
}

export function ColorSchemeProvider(props: Readonly<ColorSchemeProviderProps>): ReactNode {
	const { children } = props;

	/**
	 * Re-apply the data attribute to the `html` element when the root layout re-mounts,
	 * e.g. on locale change.
	 */
	useLayoutEffect(() => {
		window.__colorScheme.apply();
	}, []);

	return children;
}
