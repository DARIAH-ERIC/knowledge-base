"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { useExtracted } from "next-intl";
import { type ReactNode, useActionState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { updateOrganigramAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/organigram/_lib/update-organigram.action";

interface OrganigramFormProps {
	nodes: Array<
		Pick<schema.OrganigramNode, "description" | "id" | "kind" | "label" | "position" | "slug"> & {
			entity: {
				id: string;
				slug: string;
				name: string;
				type: string;
			} | null;
		}
	>;
}

export function OrganigramForm(props: Readonly<OrganigramFormProps>): ReactNode {
	const { nodes } = props;

	const t = useExtracted();
	const [state, action, isPending] = useActionState(
		updateOrganigramAction,
		createActionStateInitial(),
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				{nodes.map((node, index) => {
					const title = node.entity?.name ?? node.label;
					const description =
						node.kind === "collective"
							? t("Synthetic organigram node")
							: t("Linked to governance body: {slug}", { slug: node.entity?.slug ?? node.slug });

					return (
						<FormSection description={description} key={node.id} title={title}>
							<input name="id" type="hidden" value={node.id} />
							<input name="kind" type="hidden" value={node.kind} />

							<TextField defaultValue={node.label} isRequired={true} name="label">
								<Label>{t("Label")}</Label>
								<Input />
								{index === 0 ? <FieldError /> : null}
							</TextField>

							<TextField defaultValue={node.position ?? undefined} name="position" type="number">
								<Label>{t("Position")}</Label>
								<Input />
							</TextField>

							<TextField defaultValue={node.description ?? undefined} name="description">
								<Label>{t("Description")}</Label>
								<TextArea rows={4} />
							</TextField>
						</FormSection>
					);
				})}

				<div className="flex items-center justify-end gap-x-3">
					<FormStatus className="text-sm" state={state} />

					<Button isPending={isPending} type="submit">
						{isPending ? <span aria-hidden={true}>{t("Saving...")}</span> : t("Save")}
					</Button>
				</div>
			</Form>
		</FormLayout>
	);
}
