import "@/styles/index.css";
import "@/styles/storybook.css";

import { withThemeByDataAttribute } from "@storybook/addon-themes";
import type { Preview } from "@storybook/react-vite";
import { themes } from "storybook/theming";

import en from "../messages/en.json";

const defaultLocale = "en";

const preview: Preview = {
	decorators: [
		withThemeByDataAttribute({
			attributeName: "data-ui-color-scheme",
			defaultTheme: "light",
			themes: {
				dark: "dark",
				light: "light",
			},
		}),
	],
	initialGlobals: {
		locale: defaultLocale,
		locales: {
			en: "English",
		},
	},
	parameters: {
		a11y: {
			config: {
				rules: [
					/**
					 * @see https://react-spectrum.adobe.com/react-aria/accessibility.html#testing
					 */
					{
						id: "aria-hidden-focus",
						selector: '[aria-hidden="true"]:not([data-a11y-ignore="aria-hidden-focus"])',
					},
				],
			},
			test: "error",
		},
		backgrounds: {
			disable: true,
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		docs: {
			controls: {
				sort: "requiredFirst",
			},
			theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? themes.dark : themes.light,
		},
		nextIntl: {
			defaultLocale,
			messagesByLocale: {
				en,
			},
		},
	},
};

export default preview;
