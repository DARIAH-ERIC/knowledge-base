import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
	addons: [
		"@storybook/addon-vitest",
		"@storybook/addon-a11y",
		"@storybook/addon-themes",
		"@storybook/addon-docs",
	],
	core: {
		disableWhatsNewNotifications: true,
	},
	framework: "@storybook/react-vite",
	staticDirs: ["../public/"],
	stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
	typescript: {
		reactDocgen: "react-docgen-typescript",
		reactDocgenTypescriptOptions: {
			propFilter(prop) {
				return !prop.name.startsWith("aria-");
			},
			shouldExtractLiteralValuesFromEnum: true,
		},
	},
};

export default config;
