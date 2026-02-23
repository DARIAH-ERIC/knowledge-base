import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ForgotPasswordForm } from "@/app/(app)/[locale]/(auth)/auth/forgot-password/_components/forgot-password-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { createMetadata } from "@/lib/server/create-metadata";

interface ForgotPasswordPageProps extends PageProps<"/[locale]/auth/forgot-password"> {}

export async function generateMetadata(
	_props: Readonly<ForgotPasswordPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("ForgotPasswordPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function ForgotPasswordPage(
	_props: Readonly<ForgotPasswordPageProps>,
): Promise<ReactNode> {
	const t = await getTranslations("ForgotPasswordPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<ForgotPasswordForm />

				<div>
					<Link href={"/auth/sign-in"}>{t("sign-in")}</Link>
				</div>
			</section>
		</Main>
	);
}
