import { Avatar } from "@dariah-eric/ui/avatar";
import { ButtonLink } from "@dariah-eric/ui/button-link";
import { Text, TextLink } from "@dariah-eric/ui/text";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted, getLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { Main } from "@/app/(app)/[locale]/(default)/_components/main";
import { env } from "@/config/env.config";
import { getCurrentSession } from "@/lib/auth/session";
import { redirect } from "@/lib/navigation/navigation";
import { createMetadata } from "@/lib/server/create-metadata";

interface IndexPageProps extends PageProps<"/[locale]"> {}

export async function generateMetadata(
	_props: Readonly<IndexPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const metadata: Metadata = await createMetadata(resolvingMetadata, {
		/**
		 * Fall back to `title.default` from `layout.tsx`.
		 *
		 * @see {@link https://nextjs.org/docs/app/api-reference/functions/generate-metadata#title}
		 */
	});

	return metadata;
}

export default async function IndexPage(_props: Readonly<IndexPageProps>): Promise<ReactNode> {
	const locale = await getLocale();
	const t = await getExtracted();

	const { session } = await getCurrentSession();

	// Everything behind this page requires an account, so for a signed-in user it is only a detour.
	// Unverified or half-signed-in sessions are sorted out by the dashboard's own guard.
	if (session != null) {
		redirect({ href: "/dashboard", locale });
	}

	return (
		<Main className="container flex-1 px-8 py-12 xs:px-16">
			<section className="flex flex-col items-center gap-y-8 py-16 sm:py-24">
				<Avatar
					className="dark:invert"
					isSquare={true}
					size="2xl"
					src="/assets/images/logo-dariah.svg"
				/>

				<div className="flex flex-col items-center gap-y-4">
					<h1 className="text-center text-4xl font-extrabold tracking-tight text-text-strong sm:text-5xl lg:text-6xl">
						{t("DARIAH Knowledge Base")}
					</h1>
					<p className="text-center text-xl font-medium tracking-tight text-text-weak sm:text-2xl">
						{t("Your central hub for everything DARIAH-related.")}
					</p>
				</div>

				<div className="flex flex-col items-center gap-y-4">
					<ButtonLink className="min-inline-40" href="/auth/sign-in" size="lg">
						{t("Sign in")}
					</ButtonLink>

					{env.AUTH_SIGN_UP === "enabled" ? (
						<Text className="text-center">
							{t.rich("Don't have an account? <link>Create one</link>", {
								link(chunks) {
									return <TextLink href="/auth/sign-up">{chunks}</TextLink>;
								},
							})}
						</Text>
					) : (
						<Text className="text-center">
							{t.rich(
								"Access is limited to DARIAH members. <link>Get in touch</link> to request an account.",
								{
									link(chunks) {
										return <TextLink href="/contact">{chunks}</TextLink>;
									},
								},
							)}
						</Text>
					)}
				</div>
			</section>
		</Main>
	);
}
