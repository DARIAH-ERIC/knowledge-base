"use client";

import { Avatar } from "@dariah-eric/ui/avatar";
import { Button } from "@dariah-eric/ui/button";
import { ButtonLink } from "@dariah-eric/ui/button-link";
import type { ReactNode } from "react";

import { Main } from "@/components/main";

interface ErrorStateProps {
	description: string;
	homeHref: string;
	homeLabel: string;
	logoLabel: string;
	recoveryLabel: string;
	reset: () => void;
	resetLabel: string;
	statusLabel: string;
	title: string;
}

export function ErrorState(props: Readonly<ErrorStateProps>): ReactNode {
	const {
		description,
		homeHref,
		homeLabel,
		logoLabel,
		recoveryLabel,
		reset,
		resetLabel,
		statusLabel,
		title,
	} = props;

	return (
		<Main className="relative isolate flex min-h-full items-center justify-center overflow-hidden px-6 py-10 sm:px-8">
			<div
				aria-hidden={true}
				className="-translate-x-1/2 absolute top-0 left-1/2 h-80 w-2xl rounded-full bg-primary/12 blur-3xl"
			/>
			<div
				aria-hidden={true}
				className="absolute right-0 bottom-0 size-72 rounded-full bg-primary/10 blur-3xl"
			/>

			<section className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-border/70 bg-bg/90 shadow-lg shadow-black/5 backdrop-blur-sm">
				<div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/20 via-primary to-primary/20" />

				<div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12 lg:p-12">
					<div className="flex flex-col gap-6">
						<ButtonLink
							aria-label={logoLabel}
							className="self-start"
							href={homeHref}
							intent="plain"
							size="sm"
						>
							<Avatar
								className="dark:invert"
								isSquare={true}
								size="md"
								src="/assets/images/logo-dariah.svg"
							/>
						</ButtonLink>

						<div className="space-y-3">
							<p className="font-medium text-muted-fg text-sm uppercase tracking-[0.24em]">
								{statusLabel}
							</p>
							<h1 className="max-w-lg font-semibold text-3xl text-balance sm:text-4xl">{title}</h1>
							<p className="max-w-xl text-base text-muted-fg sm:text-lg">{description}</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Button onPress={reset} size="lg">
								{resetLabel}
							</Button>
							<ButtonLink href={homeHref} intent="outline" size="lg">
								{homeLabel}
							</ButtonLink>
						</div>
					</div>

					<div className="relative hidden min-h-80 overflow-hidden rounded-[1.5rem] border border-border/60 bg-secondary/60 lg:block">
						<div
							aria-hidden={true}
							className="absolute inset-6 rounded-[1.25rem] border border-dashed border-border/80"
						/>
						<div
							aria-hidden={true}
							className="absolute top-8 right-8 rounded-full border border-border/70 bg-bg/90 px-3 py-1 font-medium text-muted-fg text-xs uppercase tracking-[0.2em]"
						>
							{recoveryLabel}
						</div>
						<div className="absolute inset-0 flex items-center justify-center">
							<div className="relative aspect-square w-56 max-w-[75%]">
								<div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/8" />
								<div className="absolute inset-6 rounded-full border border-primary/30" />
								<div className="absolute inset-14 rounded-3xl border border-border/70 bg-bg/95 shadow-lg shadow-black/5" />
								<div className="absolute inset-x-20 top-24 h-2 rounded-full bg-primary/80" />
								<div className="absolute inset-x-20 top-32 h-2 rounded-full bg-muted" />
								<div className="absolute inset-x-20 top-40 h-2 rounded-full bg-muted" />
								<div className="absolute right-16 bottom-16 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-lg shadow-primary/25">
									<svg
										aria-hidden={true}
										className="size-7"
										fill="none"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M12 8V12M12 16H12.01M10.29 3.86L1.82 18A2 2 0 0 0 3.53 21H20.47A2 2 0 0 0 22.18 18L13.71 3.86A2 2 0 0 0 10.29 3.86Z"
											stroke="currentColor"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth="1.75"
										/>
									</svg>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</Main>
	);
}
