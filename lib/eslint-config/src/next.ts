import nextConfig from "@acdh-oeaw/eslint-config-next";
import nodeConfig from "@acdh-oeaw/eslint-config-node";
import { defineConfig } from "eslint/config";

export const restrictedImports = {
	paths: [
		{
			allowTypeImports: true,
			message: "Please use `@/components/image` instead.",
			name: "next/image",
		},
		{
			allowImportNames: ["useLinkStatus"],
			message: "Please use `@/components/link` instead.",
			name: "next/link",
		},
		{
			importNames: ["permanentRedirect", "redirect", "usePathname", "useRouter", "useSearchParams"],
			message: "Please use `@/lib/navigation/navigation` instead.",
			name: "next/navigation",
		},
		{
			message: "Please use `@/lib/navigation/navigation` instead.",
			name: "next/router",
		},
	],
};

const config = defineConfig(
	{
		rules: {
			"@typescript-eslint/no-restricted-imports": ["error", { paths: restrictedImports.paths }],
		},
	},
	nextConfig,
	{
		name: "node-config",
		extends: [nodeConfig],
		files: ["lib/server/**/*.ts", "**/_lib/**/*.action.ts", "scripts/**/*.ts"],
	},
);

export default config;
