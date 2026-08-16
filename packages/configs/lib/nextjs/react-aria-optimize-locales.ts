/*
 * Copyright 2026 Adobe. All rights reserved.
 * Modified in 2026 by Stefan Probst.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { fileURLToPath } from "node:url";

const reactAriaPackages = [
	"@react-stately",
	"@react-aria",
	"@react-spectrum",
	"@adobe/react-spectrum",
	"react-stately",
	"react-aria",
	"react-aria-components",
] as const;

const localeExtensions = ["json", "mjs", "js", "cjs"] as const;

interface Options {
	locales: ReadonlyArray<string>;
}

interface TurbopackRule {
	as: "*.js";
	loaders: Array<{
		loader: string;
		options: {
			locales: Array<string>;
		};
	}>;
}

/**
 * Creates Turbopack rules which remove unused React Aria locale modules.
 *
 * A language without a region retains all of its regional variants, e.g. `en` retains `en-US`.
 *
 * @see {@link https://github.com/stefanprobst/react-aria-optimize-locales-turbopack}
 */
export function optimizeReactAriaLocales(options: Readonly<Options>): {
	rules: Record<string, TurbopackRule>;
} {
	if (!Array.isArray(options.locales)) {
		throw new TypeError("locales must be an array.");
	}

	const locales = options.locales.map((locale) => new Intl.Locale(locale).toString());
	const loader = fileURLToPath(
		new URL("./react-aria-optimize-locales-loader.cjs", import.meta.url),
	);
	const rules: Record<string, TurbopackRule> = {};

	for (const packageName of reactAriaPackages) {
		for (const extension of localeExtensions) {
			rules[`**/${packageName}/**/??-??.${extension}`] = {
				loaders: [
					{
						loader,
						options: { locales },
					},
				],
				as: "*.js",
			};
		}
	}

	return { rules };
}
