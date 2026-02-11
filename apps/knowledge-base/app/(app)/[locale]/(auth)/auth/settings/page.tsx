import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { RecoveryCodeForm } from "@/app/(app)/[locale]/(auth)/auth/settings/_components/recovery-code-form";
import { UpdateEmailForm } from "@/app/(app)/[locale]/(auth)/auth/settings/_components/update-email-form";
import { UpdatePasswordForm } from "@/app/(app)/[locale]/(auth)/auth/settings/_components/update-password-form";
import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { getCurrentSession, getUserRecoverCode } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

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

	if (!(await globalGetRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		redirect({ href: urls.signIn, locale });
	}

	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		redirect({ href: urls["2fa"], locale });
	}

	let recoveryCode: string | null = null;

	if (user.isTwoFactorRegistered) {
		recoveryCode = await getUserRecoverCode(user.id);
	}

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<div>
					<h2>{t("update-email")}</h2>

					<p>{t("your-email", { email: user.email })}</p>

					<UpdateEmailForm />
				</div>
			</section>

			<section>
				<div>
					<h2>{t("update-password")}</h2>

					<UpdatePasswordForm />
				</div>
			</section>

			{user.isTwoFactorRegistered ? (
				<section>
					<div>
						<h2>{t("update-2fa")}</h2>

						<div>
							<Link href={urls["2faSetup"]}>{t("update")}</Link>
						</div>
					</div>
				</section>
			) : null}

			{recoveryCode != null && (
				<section>
					<div>
						<h2>{t("recovery-code")}</h2>

						<RecoveryCodeForm recoveryCode={recoveryCode} />
					</div>
				</section>
			)}
		</Main>
	);
}
