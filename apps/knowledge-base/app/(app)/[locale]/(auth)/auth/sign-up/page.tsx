import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { SignUpForm } from "@/app/(app)/[locale]/(auth)/auth/sign-up/_components/sign-up-form";
import { Main } from "@/components/main";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/ui/link";
import { Text, TextLink } from "@/components/ui/text";
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

					<Text>
						{t("message", {
							passwordMinLength: passwords.length.min,
							passwordMaxLength: passwords.length.max,
						})}
					</Text>
				</div>

				<SignUpForm />

				<Text className="mt-4">
					{t("has-account")} <TextLink href="/auth/sign-in">{t("sign-in")}</TextLink>
				</Text>
			</div>
		</Main>
	);
}
