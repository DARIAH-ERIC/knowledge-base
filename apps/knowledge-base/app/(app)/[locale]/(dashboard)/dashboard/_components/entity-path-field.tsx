"use client";

import { Description, FieldError, Label } from "@dariah-eric/ui/field";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import type { ReactNode } from "react";

interface EntityPathFieldProps {
	/** The page's current path, or null when it has none yet. Omit when creating. */
	path?: string | null;
	/**
	 * Whether the page is already published. A published path is a live URL whose change needs a
	 * redirect, so the field goes read-only and points at the maintenance page editor. The server
	 * enforces this too — the field being read-only is a courtesy, not the check.
	 */
	isPublished?: boolean;
}

/**
 * The path field for pages: the full website address a page renders at (e.g. `/about/strategy`).
 * Unlike a slug, a page's URL is nested and cannot be derived, so it is authored here.
 *
 * Three states, mirroring the slug field: creating (empty), draft (freely editable — nothing links
 * to it yet), published (frozen outside the maintenance page).
 */
export function EntityPathField(props: Readonly<EntityPathFieldProps>): ReactNode {
	const { path, isPublished = false } = props;

	const t = useExtracted();

	if (isPublished) {
		return (
			// A disabled field submits no value, so the action sees no requested path and leaves the
			// published one alone.
			<TextField isDisabled={true} name="path" value={path ?? ""}>
				<Label>{t("Path")}</Label>
				<Input />
				<Description>
					{t(
						"This page is published, so its address is public. Changing it can break existing links, so it is done by an administrator on the Maintenance page.",
					)}
				</Description>
			</TextField>
		);
	}

	return (
		<TextField defaultValue={path ?? ""} name="path">
			<Label>{t("Path")}</Label>
			<Input placeholder="/about/strategy" />
			<Description>
				{t(
					"The full website address this page renders at, like /about/strategy. It isn't public until the page is published, so you can still change it freely. Leave empty if the page has no address yet.",
				)}
			</Description>
			<FieldError />
		</TextField>
	);
}
