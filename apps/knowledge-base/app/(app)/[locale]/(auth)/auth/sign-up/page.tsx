import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SignUpForm } from "@/app/(app)/[locale]/(auth)/auth/sign-up/_components/sign-up-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import {
	passwordMaxLength,
	passwordMinLength,
	urls,
	usernameMaxLength,
	usernameMinLength,
} from "@/config/auth.config";
import { getCurrentSession } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface SignUpPageProps extends PageProps<"/[locale]/auth/sign-up"> {}

export async function generateMetadata(
	_props: Readonly<SignUpPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("SignUpPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function SignUpPage(_props: Readonly<SignUpPageProps>): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("SignUpPage");
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
			<section>
				<div>
					<h1>{t("title")}</h1>
					<p>
						{t("message", {
							passwordMinLength,
							passwordMaxLength,
							usernameMinLength,
							usernameMaxLength,
						})}
					</p>
				</div>
			</section>

			<section>
				<SignUpForm />

				<div>
					<span>{t("has-account")}</span>
					<Link href={urls.signIn}>{t("sign-in")}</Link>
				</div>
			</section>
		</Main>
	);
}
