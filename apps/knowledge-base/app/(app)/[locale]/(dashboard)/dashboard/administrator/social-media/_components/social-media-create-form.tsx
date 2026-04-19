"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { SocialMediaForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_components/social-media-form";
import { createSocialMediaAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/social-media/_lib/create-social-media.action";

export function SocialMediaCreateForm(): ReactNode {
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New social media")}</Heading>

			<SocialMediaForm formAction={createSocialMediaAction} />
		</Fragment>
	);
}
