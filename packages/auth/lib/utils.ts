import { getRandomValues } from "node:crypto";

import { sha256 } from "@oslojs/crypto/sha2";
import {
	encodeBase32,
	encodeBase32LowerCaseNoPadding,
	encodeBase32UpperCaseNoPadding,
	encodeHexLowerCase,
} from "@oslojs/encoding";

export { encodeBase32, encodeBase32LowerCaseNoPadding, encodeHexLowerCase, sha256 };

export function generateRandomOTP(): string {
	const bytes = new Uint8Array(5);
	getRandomValues(bytes);
	const code = encodeBase32UpperCaseNoPadding(bytes);

	return code;
}

export function generateRandomRecoveryCode(): string {
	const recoveryCodeBytes = new Uint8Array(10);
	getRandomValues(recoveryCodeBytes);
	const recoveryCode = encodeBase32UpperCaseNoPadding(recoveryCodeBytes);

	return recoveryCode;
}
