import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SignInForm } from "@/app/(app)/[locale]/(auth)/auth/sign-in/_components/sign-in-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { getCurrentSession } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface SignInPageProps extends PageProps<"/[locale]/auth/sign-in"> {}

export async function generateMetadata(
	_props: Readonly<SignInPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("SignInPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function SignInPage(_props: Readonly<SignInPageProps>): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("SignInPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session != null) {
		if (!user.isEmailVerified) {
			redirect({ href: urls.verifyEmail, locale });
		}

		if (!user.isTwoFactorRegistered) {
			redirect({ href: urls["2faSetup"], locale });
		}

		if (!session.isTwoFactorVerified) {
			redirect({ href: urls["2fa"], locale });
		}

		redirect({ href: urls.afterSignIn, locale });
	}

	return (
		<Main>
			<div>
				<h1>{t("title")}</h1>
			</div>

			<section>
				<SignInForm />

				<div className="flex flex-wrap items-center gap-x-6">
					<Link href={urls.signUp}>{t("sign-up")}</Link>
					<Link href={urls.forgotPassword}>{t("forgot-password")}</Link>
				</div>
			</section>
		</Main>
	);
}
