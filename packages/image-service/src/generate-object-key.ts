import { v7 as uuidv7 } from "uuid";

export function generateObjectKey(prefix: "avatars" | "images"): string {
	const objectName = `${prefix}/${uuidv7()}`;

	return objectName;
}
