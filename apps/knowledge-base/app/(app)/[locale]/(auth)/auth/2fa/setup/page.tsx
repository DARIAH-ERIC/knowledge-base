// eslint-disable-next-line check-file/folder-naming-convention
import { getRandomValues } from "node:crypto";

import { createTOTPKeyURI, encodeBase64 } from "@dariah-eric/auth";
import type { Metadata, ResolvingMetadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { renderSVG } from "uqr";

import { TwoFactorSetUpForm } from "@/app/(app)/[locale]/(auth)/auth/2fa/setup/_components/two-factor-set-up-form";
import { Main } from "@/components/main";
import { issuer, urls } from "@/config/auth.config";
import { getCurrentSession } from "@/lib/data/users";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/metadata";
import { globalGetRateLimit } from "@/lib/server/rate-limit/global-rate-limit";

interface TwoFactorSetupPageProps extends PageProps<"/[locale]/auth/2fa/setup"> {}

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

	if (user.isTwoFactorRegistered && !session.isTwoFactorVerified) {
		redirect({ href: urls["2fa"], locale });
	}

	const totpKey = new Uint8Array(20);
	getRandomValues(totpKey);
	const encodedTOTPKey = encodeBase64(totpKey);
	const keyURI = createTOTPKeyURI(issuer, user.username, totpKey, 30, 6);
	const qrcode = renderSVG(keyURI);

	return (
		<Main>
			<section>
				<div>
					<h1>{t("title")}</h1>
				</div>
			</section>

			<section>
				<div>
					<div className="size-48" dangerouslySetInnerHTML={{ __html: qrcode }} />

					<TwoFactorSetUpForm encodedTOTPKey={encodedTOTPKey} />
				</div>
			</section>
		</Main>
	);
}
