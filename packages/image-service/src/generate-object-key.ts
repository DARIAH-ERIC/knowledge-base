import slugify from "@sindresorhus/slugify";
import { v7 as uuidv7 } from "uuid";

export function generateObjectKey(prefix: string, fileName: string): string {
	const objectName = `${prefix}/${uuidv7()}-${slugify(fileName)}`;

	return objectName;
}
