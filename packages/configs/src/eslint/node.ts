import baseConfig from "@acdh-oeaw/eslint-config";
import nodeConfig from "@acdh-oeaw/eslint-config-node";
import { defineConfig, globalIgnores } from "eslint/config";
import gitignore from "eslint-config-flat-gitignore";
import checkFilePlugin from "eslint-plugin-check-file";
import unicornPlugin from "eslint-plugin-unicorn";

const config = defineConfig(
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
					message: "Please use `./config/env.config` instead.",
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
			"unicorn/prefer-ternary": "off",
			"unicorn/prefer-top-level-await": "off",
			"unicorn/require-module-specifiers": "off",
			"unicorn/switch-case-braces": "error",
			"unicorn/text-encoding-identifier-case": ["error", { withDash: true }],
			/** @saee {@link https://github.com/sindresorhus/eslint-plugin-unicorn/issues/2360} */
			"unicorn/throw-new-error": "off",
		},
	},
	nodeConfig,
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
);

export default config;
