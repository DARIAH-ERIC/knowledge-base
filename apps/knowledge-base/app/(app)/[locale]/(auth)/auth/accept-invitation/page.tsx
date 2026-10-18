import { globalGetRequestRateLimit } from "@dariah-eric/next-lib/rate-limiter";
import { Avatar } from "@dariah-eric/ui/avatar";
import { Link } from "@dariah-eric/ui/link";
import { Text, TextLink } from "@dariah-eric/ui/text";
import type { Metadata, ResolvingMetadata } from "next";
import { getExtracted } from "next-intl/server";
import type { ReactNode } from "react";

import { AcceptInvitationForm } from "@/app/(app)/[locale]/(auth)/auth/accept-invitation/_components/accept-invitation-form";
import { Main } from "@/components/main";
import { auth } from "@/lib/auth";
import { createMetadata } from "@/lib/server/create-metadata";

interface AcceptInvitationPageProps extends PageProps<"/[locale]/auth/accept-invitation"> {}

export async function generateMetadata(
	_props: Readonly<AcceptInvitationPageProps>,
	resolvingMetadata: ResolvingMetadata,
): Promise<Metadata> {
	const t = await getExtracted();

	const metadata: Metadata = {
		...(await createMetadata(resolvingMetadata, {
			title: t("Accept invitation"),
		})),
		/** The token is in the url, so it must not leak to other sites through the referrer. */
		referrer: "no-referrer",
	};

	return metadata;
}

export default async function AcceptInvitationPage(
	props: Readonly<AcceptInvitationPageProps>,
): Promise<ReactNode> {
	const { searchParams } = props;

	const t = await getExtracted();

	if (!(await globalGetRequestRateLimit())) {
		return t("Too many requests.");
	}

	const { token } = await searchParams;

	/** Only looked up, never consumed: email link scanners prefetch with GET requests. */
	const invitation = typeof token === "string" ? await auth.getUserInvitation(token) : null;

	return (
		<Main className="flex flex-col items-center justify-center p-6 min-block-full">
			<div className="flex flex-col gap-y-4 inline-full max-inline-sm">
				<Link aria-label={t("Home")} className="mbe-2 inline-block self-start rounded-xs" href="/">
					<Avatar
						className="dark:invert"
						isSquare={true}
						size="md"
						src="/assets/images/logo-dariah.svg"
					/>
				</Link>

				{invitation != null && typeof token === "string" ? (
					<div className="flex flex-col gap-y-4">
						<div>
							<h1 className="text-xl/10 font-semibold">
								{t("Welcome, {name}", { name: invitation.user.name })}
							</h1>

							<Text>
								{t("Choose a password for your account {email}.", {
									email: invitation.user.email,
								})}
							</Text>
						</div>

						<AcceptInvitationForm email={invitation.user.email} token={token} />
					</div>
				) : (
					<div>
						<h1 className="text-xl/10 font-semibold">{t("Invitation not valid")}</h1>

						<Text>
							{t(
								"This invitation link is invalid or has expired. Ask an administrator to send you a new one.",
							)}
						</Text>

						<Text className="mbs-4">
							{t("Already set a password?")}{" "}
							<TextLink href="/auth/sign-in">{t("Sign in")}</TextLink>
						</Text>
					</div>
				)}
			</div>
		</Main>
	);
}
