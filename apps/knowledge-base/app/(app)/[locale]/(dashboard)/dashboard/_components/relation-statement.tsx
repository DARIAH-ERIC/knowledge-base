"use client";

import { Badge } from "@dariah-eric/ui/badge";
import { useExtracted, useFormatter } from "next-intl";
import type { ReactNode } from "react";

import { RelationLink } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-link";

interface RelationStatementProps {
	source: ReactNode;
	sourceHref?: string | null;
	relation: ReactNode;
	target: ReactNode;
	targetHref?: string | null;
	targetType?: ReactNode;
	duration?: { start: Date; end?: Date | null };
}

export function RelationStatement(props: Readonly<RelationStatementProps>): ReactNode {
	const {
		source,
		sourceHref = null,
		relation,
		target,
		targetHref = null,
		targetType,
		duration,
	} = props;

	const t = useExtracted();
	const format = useFormatter();
	const formattedDuration =
		duration == null
			? null
			: duration.end != null
				? format.dateTimeRange(duration.start, duration.end, { dateStyle: "short" })
				: `${format.dateTime(duration.start, { dateStyle: "short" })} - ${t("present")}`;

	return (
		<li className="text-sm">
			<RelationLink className="font-medium" href={sourceHref}>
				{source}
			</RelationLink>
			{" · "}
			<span className="text-muted-fg">{relation}</span>
			{" · "}
			<RelationLink className="text-muted-fg" href={targetHref}>
				{target}
			</RelationLink>
			{targetType != null ? (
				<>
					{" "}
					<Badge intent="slate">{targetType}</Badge>
				</>
			) : null}
			{formattedDuration != null ? (
				<span className="text-muted-fg">
					{" · "}
					{formattedDuration}
				</span>
			) : null}
		</li>
	);
}
