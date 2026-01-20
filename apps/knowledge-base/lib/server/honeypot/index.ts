import { HoneypotError } from "@/lib/server/errors/index";

export const fieldName = "phone-numbers";

export function assertValidFormSubmission(formData: FormData): void {
	if (formData.get(fieldName) !== "") {
		throw new HoneypotError();
	}
}
