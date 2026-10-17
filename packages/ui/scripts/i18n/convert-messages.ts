import { readFile, writeFile } from "node:fs/promises";

import { log, set } from "@acdh-oeaw/lib";
import POParser from "po-parser";

async function main() {
	const content = await readFile("./messages/en.po", { encoding: "utf-8" });
	const result = POParser.parse(content);

	const json = {};

	/**
	 * The catalog uses next-intl's gettext layout: the message key (namespace-qualified, e.g.
	 * `ui.JDP92p`) in `msgctxt`, the source text in `msgid`. In the source locale `msgstr` stays
	 * empty when it matches the source text. An entry without `msgctxt` uses its source text as key.
	 */
	for (const message of result.messages ?? []) {
		const key = message.msgctxt ?? message.msgid;
		set(json, key.split("."), message.msgstr !== "" ? message.msgstr : message.msgid);
	}

	await writeFile("./messages/en.json", `${JSON.stringify(json, null, 2)}\n`);

	log.success("Successfully converted i18n messages.");
}

main().catch((error: unknown) => {
	log.error("Failed to convert i18n messages.\n", error);
});
