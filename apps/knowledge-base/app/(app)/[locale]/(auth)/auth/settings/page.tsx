import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { RecoveryCodeForm } from "@/app/(app)/[locale]/(auth)/auth/settings/_components/recovery-code-form";
import { UpdateEmailForm } from "@/app/(app)/[locale]/(auth)/auth/settings/_components/update-email-form";
import { UpdatePasswordForm } from "@/app/(app)/[locale]/(auth)/auth/settings/_components/update-password-form";
import { Main } from "@/components/main";
import { Avatar } from "@dariah-eric/ui/avatar";
import { Link } from "@dariah-eric/ui/link";
import { Text, TextLink } from "@dariah-eric/ui/text";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface SettingsPageProps extends PageProps<"/[locale]/auth/settings"> {}

export async function generateMetadata(
	_props: Readonly<SettingsPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("SettingsPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function SettingsPage(
	_props: Readonly<SettingsPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("SettingsPage");
	const e = await getTranslations("errors");

	if (!(await globalGetRequestRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		redirect({ href: "/auth/sign-in", locale });
	}

	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		redirect({ href: "/auth/two-factor", locale });
	}

	let recoveryCode: string | null = null;

	if (user.isTwoFactorRegistered) {
		recoveryCode = await auth.getRecoveryCode(user.id);
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

					{/* <Text>{t("message")}</Text> */}
				</div>

				<section className="flex flex-col gap-y-4">
					<div>
						<h2 className="text-base/8 font-semibold">{t("update-email")}</h2>

						<Text>
							{t("your-email")} <span className="text-fg">{user.email}</span>
						</Text>
					</div>

					<UpdateEmailForm />
				</section>

				<section className="flex flex-col gap-y-4">
					<div>
						<h2 className="text-base/8 font-semibold">{t("update-password")}</h2>
					</div>

					<UpdatePasswordForm />
				</section>

				{user.isTwoFactorRegistered ? (
					<section className="flex flex-col gap-y-4">
						<div>
							<h2 className="text-base/8 font-semibold">{t("update-two-factor")}</h2>
						</div>

						<Text>
							<TextLink href={"/auth/two-factor/setup"}>{t("update")}</TextLink>
						</Text>
					</section>
				) : null}

				{recoveryCode != null && (
					<section className="flex flex-col gap-y-4">
						<div>
							<h2 className="text-base/8 font-semibold">{t("recovery-code")}</h2>
						</div>

						<RecoveryCodeForm recoveryCode={recoveryCode} />
					</section>
				)}
			</div>
		</Main>
	);
}
