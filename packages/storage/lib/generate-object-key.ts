import { v7 as uuidv7 } from "uuid";

import type { AssetPrefix } from "../config/images.config";

export function generateObjectKey(prefix: AssetPrefix): string {
	const objectName = `${prefix}/${uuidv7()}`;

	return objectName;
}
