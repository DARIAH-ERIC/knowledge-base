import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { renderSVG } from "uqr";

import { TwoFactorSetUpForm } from "@/app/(app)/[locale]/(auth)/auth/two-factor/setup/_components/two-factor-set-up-form";
import { Main } from "@/components/main";
import { issuer } from "@/config/auth.config";
import { auth } from "@/lib/auth";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface TwoFactorSetupPageProps extends PageProps<"/[locale]/auth/two-factor/setup"> {}

export async function generateMetadata(
	_props: Readonly<TwoFactorSetupPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getTranslations("TwoFactorSetupPage");

	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		title: t("meta.title"),
	});

	return metadata;
}

export default async function TwoFactorSetupPage(
	_props: Readonly<TwoFactorSetupPageProps>,
): Promise<ReactNode> {
	const locale = await getLocale();

	const t = await getTranslations("TwoFactorSetupPage");
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

	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		redirect({ href: "/auth/two-factor", locale });
	}

	const { key, uri } = auth.createTotpKeyUri(issuer, user.name);
	const qrcode = renderSVG(uri);

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<div>
					{/* eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml */}
					<div className="size-48" dangerouslySetInnerHTML={{ __html: qrcode }} />

					<TwoFactorSetUpForm encodedTotpKey={key} />
				</div>
			</section>
		</Main>
	);
}
