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
				"**/*": "?(_)+([a-z])*([a-z0-9])*(-+([a-z0-9]))",
			},
			{ ignoreMiddleExtensions: true },
		],
		"check-file/folder-naming-convention": [
			"error",
			{
				"**/": "NEXT_JS_APP_ROUTER_CASE",
			},
		],
	},
});

export default config;
