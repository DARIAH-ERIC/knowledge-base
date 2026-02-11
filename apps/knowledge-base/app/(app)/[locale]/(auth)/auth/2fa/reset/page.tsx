// eslint-disable-next-line check-file/folder-naming-convention
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { TwoFactorResetForm } from "@/app/(app)/[locale]/(auth)/auth/2fa/reset/_components/two-factor-reset-form";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { getCurrentSession } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface TwoFactorResetPageProps extends PageProps<"/[locale]/auth/2fa/reset"> {}

export async function generateMetadata(
	_props: Readonly<TwoFactorResetPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("TwoFactorResetPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function TwoFactorResetPage(
	_props: Readonly<TwoFactorResetPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("TwoFactorResetPage");
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
				<TwoFactorResetForm />
			</section>
		</Main>
	);
}
