// eslint-disable-next-line check-file/folder-naming-convention
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { PasswordResetRecoveryCodeForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/2fa/_components/password-reset-recovery-code-form";
import { PasswordResetTOTPForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/2fa/_components/password-reset-totp-form";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { validatePasswordResetSessionRequest } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface PasswordResetTwoFactorPageProps extends PageProps<"/[locale]/auth/reset-password/2fa"> {}

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

	if (!(await globalGetRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await validatePasswordResetSessionRequest();

	if (session == null) {
		redirect({ href: urls.forgotPassword, locale });
	}

	if (!session.isEmailVerified) {
		redirect({ href: urls.resetPasswordVerifyEmail, locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: urls.resetPassword, locale });
	}

	if (session.isTwoFactorVerified) {
		redirect({ href: urls.resetPassword, locale });
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

					<PasswordResetTOTPForm />
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
