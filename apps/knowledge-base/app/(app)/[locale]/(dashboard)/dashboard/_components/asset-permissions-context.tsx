"use client";

import { type ReactNode, createContext, use } from "react";

/**
 * What the current user may do in the media library beyond picking an existing asset. Resolved once
 * in the dashboard layout, so the library only offers what the server actions will accept.
 */
export interface AssetPermissions {
	canUpload: boolean;
	canEditMetadata: boolean;
}

/** Without a provider, nothing beyond picking is offered. */
const AssetPermissionsContext = createContext<AssetPermissions>({
	canUpload: false,
	canEditMetadata: false,
});

interface AssetPermissionsProviderProps {
	value: AssetPermissions;
	children: ReactNode;
}

export function AssetPermissionsProvider(
	props: Readonly<AssetPermissionsProviderProps>,
): ReactNode {
	const { value, children } = props;

	return <AssetPermissionsContext value={value}>{children}</AssetPermissionsContext>;
}

export function useAssetPermissions(): AssetPermissions {
	return use(AssetPermissionsContext);
}
