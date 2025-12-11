import baseConfig from "@acdh-oeaw/eslint-config";
import nodeConfig from "@acdh-oeaw/eslint-config-node";
import { defineConfig, globalIgnores } from "eslint/config";
import gitignore from "eslint-config-flat-gitignore";
import turboConfig from "eslint-config-turbo/flat";
import checkFilePlugin from "eslint-plugin-check-file";
// @ts-expect-error Missing type declarations.
import drizzlePlugin from "eslint-plugin-drizzle";
import unicornPlugin from "eslint-plugin-unicorn";

export default defineConfig(
	gitignore({ strict: true }),
	globalIgnores(["dist/**"]),
	{
		name: "base-config",
		extends: [baseConfig],
		rules: {
			"arrow-body-style": ["error", "always"],
			"no-restricted-syntax": [
				"error",
				{
					message: "Please use `@/config/env.config` instead.",
					selector: 'MemberExpression[computed!=true][object.name="process"][property.name="env"]',
				},
			],
			"object-shorthand": ["error", "always", { avoidExplicitReturnArrows: true }],
			"preserve-caught-error": "error",
			"@typescript-eslint/explicit-module-boundary-types": "error",
			"@typescript-eslint/require-array-sort-compare": "error",
			"@typescript-eslint/strict-boolean-expressions": "error",
		},
	},
	{
		name: "unicorn-config",
		extends: [unicornPlugin.configs.unopinionated],
		rules: {
			"unicorn/catch-error-name": "error",
			"unicorn/consistent-destructuring": "error",
			/** @see {@link https://github.com/vercel/next.js/issues/60879} */
			// "unicorn/prefer-import-meta-properties": "error",
			"unicorn/explicit-length-check": "error",
			"unicorn/import-style": [
				"error",
				{
					extendDefaultStyles: false,
					styles: {
						fs: { namespace: true },
						path: { namespace: true },
					},
				},
			],
			"unicorn/no-array-for-each": "error",
			// "unicorn/no-array-reverse": "off",
			// "unicorn/no-array-sort": "off",
			"unicorn/no-negated-condition": "off",
			"unicorn/no-useless-undefined": "off",
			"unicorn/prefer-global-this": "off",
			"unicorn/prefer-single-call": "off",
			"unicorn/prefer-top-level-await": "off",
			"unicorn/require-module-specifiers": "off",
			"unicorn/switch-case-braces": "error",
			"unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
		},
	},
	nodeConfig,
	{
		name: "drizzle-config",
		plugins: {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			drizzle: drizzlePlugin,
		},
		rules: {
			"drizzle/enforce-delete-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
			"drizzle/enforce-update-with-where": ["error", { drizzleObjectName: ["db", "tx"] }],
		},
	},
	{
		name: "file-naming-conventions-config",
		plugins: {
			"check-file": checkFilePlugin,
		},
		rules: {
			"check-file/filename-naming-convention": [
				"error",
				{
					"**/*": "KEBAB_CASE",
				},
				{ ignoreMiddleExtensions: true },
			],
			"check-file/folder-naming-convention": [
				"error",
				{
					"**/": "KEBAB_CASE",
				},
			],
		},
	},
	turboConfig,
);
