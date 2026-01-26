import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { ContactForm as ContactFormContent } from "@/app/(app)/[locale]/(default)/contact/_components/contact-form.client";

export function ContactForm(): ReactNode {
	const t = useTranslations("ContactForm");

	return (
		<ContactFormContent
			emailLabel={t("email")}
			messageLabel={t("message")}
			nameLabel={t("name")}
			subjectLabel={t("subject")}
			submitLabel={t("submit")}
		/>
	);
}
