import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { ForgotPasswordForm } from "@/app/(app)/[locale]/(auth)/auth/forgot-password/_components/forgot-password-form";
import { Main } from "@/components/main";
import { Avatar } from "@/components/ui/avatar";
import { Link } from "@/components/ui/link";
import { Text, TextLink } from "@/components/ui/text";
import { createMetadata } from "@/lib/server/create-metadata";

interface ForgotPasswordPageProps extends PageProps<"/[locale]/auth/forgot-password"> {}

export async function generateMetadata(
	_props: Readonly<ForgotPasswordPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("ForgotPasswordPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function ForgotPasswordPage(
	_props: Readonly<ForgotPasswordPageProps>,
): Promise<ReactNode> {
	const t = await getTranslations("ForgotPasswordPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
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

				<ForgotPasswordForm />

				<Text>
					<TextLink href={"/auth/sign-in"}>{t("sign-in")}</TextLink>
				</Text>
			</div>
		</Main>
	);
}
