import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { EmailVerificationForm } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_components/email-verification-form";
import { ResendEmailVerificationCodeForm } from "@/app/(app)/[locale]/(auth)/auth/verify-email/_components/resend-email-verification-code-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

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

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	const { user } = await getCurrentSession();

	if (user == null) {
		redirect({ href: "/auth/sign-in", locale });
	}

	/**
	 * Ideally we'd send a new verification email automatically if the previous one is expired,
	 * but we can't set cookies inside server components.
	 */
	const emailVerificationRequest = await auth.getEmailVerificationRequestFromRequest();

	if (emailVerificationRequest == null && user.isEmailVerified) {
		redirect({ href: "/", locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
					<p>{t("message", { email: emailVerificationRequest?.email ?? user.email })}</p>
				</div>
			</section>

			<section>
				<EmailVerificationForm />

				<ResendEmailVerificationCodeForm />

				<div>
					<Link href="/auth/settings">{t("change-email")}</Link>
				</div>
			</section>
		</Main>
	);
}
