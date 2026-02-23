import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { Link } from "@/components/link";
import { Main } from "@/components/main";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

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

	if (!session.isTwoFactorVerified) {
		redirect({ href: "/auth/two-factor", locale });
	}

	const recoveryCode = await auth.getRecoveryCode(user.id);

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
						<Link href={"/"}>{t("next")}</Link>
					</div>
				</div>
			</section>
		</Main>
	);
}
