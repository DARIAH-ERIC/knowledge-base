import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { urls } from "@/config/auth.config";
import { getCurrentSession, getUserRecoverCode } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface RecoveryCodePageProps extends PageProps<"/[locale]/auth/recovery-code"> {}

export async function generateMetadata(
	_props: Readonly<RecoveryCodePageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("RecoveryCodePage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function RecoveryCodePage(
	_props: Readonly<RecoveryCodePageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("RecoveryCodePage");
	const e = await getTranslations("errors");

	if (!(await globalGetRateLimit())) {
		return e("too-many-requests");
	}

	const { session, user } = await getCurrentSession();

	if (session == null) {
		redirect({ href: urls.signIn, locale });
	}

	if (!user.isEmailVerified) {
		redirect({ href: urls.verifyEmail, locale });
	}

	if (!user.isTwoFactorRegistered) {
		redirect({ href: urls["2faSetup"], locale });
	}

	if (!session.isTwoFactorVerified) {
		redirect({ href: urls["2fa"], locale });
	}

	const recoveryCode = await getUserRecoverCode(user.id);

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<div>
					<p>
						{t("your-code")} {recoveryCode}
					</p>

					<p>{t("message")}</p>

					<div>
						<Link href={urls.afterSignIn}>{t("next")}</Link>
					</div>
				</div>
			</section>
		</Main>
	);
}
