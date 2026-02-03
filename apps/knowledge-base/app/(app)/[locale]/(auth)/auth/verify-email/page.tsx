import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { EmailVerificationForm } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_components/email-verification-form";
import { ResendEmailVerificationCodeForm } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_components/resend-email-verification-code-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { getCurrentSession, getUserEmailVerificationRequestFromRequest } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface VerifyEmailPageProps extends PageProps<"/[locale]/auth/verify-email"> {}

export async function generateMetadata(
	_props: Readonly<VerifyEmailPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("VerifyEmailPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function VerifyEmailPage(
	_props: Readonly<VerifyEmailPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("VerifyEmailPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRateLimit())) {
		return e("too-many-requests");
	}

	const { user } = await getCurrentSession();

	if (user == null) {
		redirect({ href: urls.signIn, locale });
	}

	/**
	 * Ideally we'd sent a new verification email automatically if the previous one is expired,
	 * but we can't set cookies inside server components.
	 */
	const verificationRequest = await getUserEmailVerificationRequestFromRequest();

	if (verificationRequest == null && user.isEmailVerified) {
		redirect({ href: urls.afterSignIn, locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
					<p>{t("message", { email: verificationRequest?.email ?? user.email })}</p>
				</div>
			</section>

			<section>
				<EmailVerificationForm />

				<ResendEmailVerificationCodeForm />

				<div>
					<Link href={urls.settings}>{t("change-email")}</Link>
				</div>
			</section>
		</Main>
	);
}
