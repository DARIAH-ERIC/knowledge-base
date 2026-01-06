import checkFilePlugin from "eslint-plugin-check-file";
import { defineConfig } from "eslint/config";

const config = defineConfig({
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
				"**/": "?(.)+([a-z])*([a-z0-9])*(-+([a-z0-9]))",
			},
		],
	},
});

export default config;
