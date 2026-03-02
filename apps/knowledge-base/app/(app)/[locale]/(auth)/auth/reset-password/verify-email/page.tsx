import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { PasswordResetEmailVerificationForm } from "@/app/(app)/[locale]/(auth)/auth/reset-password/verify-email/_components/password-reset-email-verification-form";
import { Main } from "@/components/main";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/ui/link";
import { Text } from "@/components/ui/text";
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
		<Main className="min-h-full p-6 items-center justify-center flex flex-col">
			<div className="w-full max-w-sm flex flex-col gap-y-4">
				<Link aria-label="Home" className="mb-2 rounded-xs self-start inline-block" href="/">
					<Avatar
						className="dark:invert"
						isSquare={true}
						size="md"
						src="/assets/images/logo-dariah.svg"
					/>
				</Link>

				<div>
					<h1 className="text-xl/10 font-semibold">{t("title")}</h1>

					<Text>{t("message", { email: session.email })}</Text>
				</div>

				<PasswordResetEmailVerificationForm />
			</div>
		</Main>
	);
}
