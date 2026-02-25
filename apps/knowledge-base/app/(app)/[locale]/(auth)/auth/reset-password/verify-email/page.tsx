import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { PasswordResetEmailVerificationForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_components/password-reset-email-verification-form";
import { Main } from "@/components/main";
import { auth } from "@/lib/auth";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface PasswordResetVerifyEmailPageProps extends PageProps<"/[locale]/auth/reset-password/verify-email"> {}

export async function generateMetadata(
	_props: Readonly<PasswordResetVerifyEmailPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("PasswordResetVerifyEmailPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function PasswordResetVerifyEmailPage(
	_props: Readonly<PasswordResetVerifyEmailPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("PasswordResetVerifyEmailPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	const { session } = await auth.validatePasswordResetSessionFromRequest();

	if (session == null) {
		redirect({ href: "/auth/forgot-password", locale });
	}

	if (session.isEmailVerified) {
		if (!session.isTwoFactorVerified) {
			redirect({ href: "/auth/reset-password/two-factor", locale });
		}

		redirect({ href: "/auth/reset-password", locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
					<p>{t("message", { email: session.email })}</p>
				</div>
			</section>

			<section>
				<PasswordResetEmailVerificationForm />
			</section>
		</Main>
	);
}
