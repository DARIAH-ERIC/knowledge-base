"use client";

import { Badge } from "@dariah-eric/ui/badge";
import type { ReactNode } from "react";

import { RelationLink } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/relation-link";

interface RelationStatementProps {
	source: ReactNode;
	sourceHref?: string | null;
	relation: ReactNode;
	target: ReactNode;
	targetHref?: string | null;
	targetType?: ReactNode;
	duration?: ReactNode;
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
			{duration != null ? (
				<span className="text-muted-fg">
					{" · "}
					{duration}
				</span>
			) : null}
		</li>
	);
}
