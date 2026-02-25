import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { PasswordResetRecoveryCodeForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/two-factor/_components/password-reset-recovery-code-form";
import { PasswordResetTotpForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/two-factor/_components/password-reset-totp-form";
import { Main } from "@/components/main";
import { auth } from "@/lib/auth";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface PasswordResetTwoFactorPageProps extends PageProps<"/[locale]/auth/reset-password/two-factor"> {}

export async function generateMetadata(
	_props: Readonly<PasswordResetTwoFactorPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("PasswordResetTwoFactorPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function PasswordResetTwoFactorPage(
	_props: Readonly<PasswordResetTwoFactorPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("PasswordResetTwoFactorPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await auth.validatePasswordResetSessionFromRequest();

	if (session == null) {
		redirect({ href: "/auth/forgot-password", locale });
	}

	if (!session.isEmailVerified) {
		redirect({ href: "/auth/reset-password/verify-email", locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: "/auth/reset-password", locale });
	}

	if (session.isTwoFactorVerified) {
		redirect({ href: "/auth/reset-password", locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<div>
					<h2>{t("enter-code")}</h2>

					<PasswordResetTotpForm />
				</div>
			</section>

			<section>
				<div>
					<h2>{t("use-recovery-code")}</h2>

					<PasswordResetRecoveryCodeForm />
				</div>
			</section>
		</Main>
	);
}
