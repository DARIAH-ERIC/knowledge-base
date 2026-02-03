// eslint-disable-next-line check-file/folder-naming-convention
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { TwoFactorVerificationForm } from "@/app/(app)/[locale]/(auth)/auth/2fa/_components/two-factor-verification-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { getCurrentSession } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface TwoFactorPageProps extends PageProps<"/[locale]/auth/2fa"> {}

export async function generateMetadata(
	_props: Readonly<TwoFactorPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("TwoFactorPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function TwoFactorPage(
	_props: Readonly<TwoFactorPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("TwoFactorPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		redirect({ href: urls.signIn, locale });
	}

	if (!user.isEmailVerified) {
		redirect({ href: urls.verifyEmail, locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: urls["2faSetup"], locale });
	}

	if (session.isTwoFactorVerified) {
		redirect({ href: urls.afterSignIn, locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<p>{t("message")}</p>

				<TwoFactorVerificationForm />

				<div>
					<Link href={urls["2faReset"]}>{t("use-recovery-code")}</Link>
				</div>
			</section>
		</Main>
	);
}
