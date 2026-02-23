import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SignUpForm } from "@/app/(app)/[locale]/(auth)/auth/sign-up/_components/sign-up-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { passwords } from "@/config/auth.config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

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

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session != null) {
		if (!user.isEmailVerified) {
			redirect({ href: "/auth/verify-email", locale });
		}

		if (!user.isTwoFactorRegistered) {
			redirect({ href: "/auth/two-factor/setup", locale });
		}

		if (!session.isTwoFactorVerified) {
			redirect({ href: "/auth/two-factor", locale });
		}

		redirect({ href: "/", locale });
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
					<p>
						{t("message", {
							passwordMinLength: passwords.length.min,
							passwordMaxLength: passwords.length.max,
						})}
					</p>
				</div>
			</section>

			<section>
				<SignUpForm />

				<div>
					<span>{t("has-account")}</span>
					<Link href="/auth/sign-in">{t("sign-in")}</Link>
				</div>
			</section>
		</Main>
	);
}
