import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ResetPasswordForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/_components/reset-password-form";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { validatePasswordResetSessionRequest } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface ResetPasswordPageProps extends PageProps<"/[locale]/auth/reset-password"> {}

export async function generateMetadata(
	_props: Readonly<ResetPasswordPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("ResetPasswordPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function ResetPasswordPage(
	_props: Readonly<ResetPasswordPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("ResetPasswordPage");
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

	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		redirect({ href: urls.resetPassword2fa, locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<ResetPasswordForm />
			</section>
		</Main>
	);
}
