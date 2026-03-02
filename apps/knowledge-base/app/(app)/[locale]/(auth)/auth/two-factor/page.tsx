import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { TwoFactorVerificationForm } from "@/app/(app)/[locale]/(auth)/auth/two-factor/_components/two-factor-verification-form";
import { Main } from "@/components/main";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/ui/link";
import { Text, TextLink } from "@/components/ui/text";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface TwoFactorPageProps extends PageProps<"/[locale]/auth/two-factor"> {}

export async function generateMetadata(
	_props: Readonly<TwoFactorPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("TwoFactorPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function TwoFactorPage(
	_props: Readonly<TwoFactorPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("TwoFactorPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		redirect({ href: "/auth/sign-in", locale });
	}

	if (!user.isEmailVerified) {
		redirect({ href: "/auth/verify-email", locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: "/auth/two-factor/setup", locale });
	}

	if (session.isTwoFactorVerified) {
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

					<Text>{t("message")}</Text>
				</div>

				<TwoFactorVerificationForm />

				<Text className="mt-4">
					<TextLink href="/auth/two-factor/reset">{t("use-recovery-code")}</TextLink>
				</Text>
			</div>
		</Main>
	);
}
