"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { useExtracted } from "next-intl";
import { type ComponentProps, Fragment, type ReactNode, useActionState } from "react";

import { FormLayout } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { EditablePerson } from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/person-relations-section";
import { PersonFormFields } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/persons/_components/person-form";
import { updateOwnPersonAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/profile/_lib/update-own-person.action";

interface ProfileFormProps {
	initialAssets: ComponentProps<typeof PersonFormFields>["initialAssets"];
	person: EditablePerson;
}

export function ProfileForm(props: Readonly<ProfileFormProps>): ReactNode {
	const { initialAssets, person } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(
		updateOwnPersonAction,
		createActionStateInitial(),
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<PersonFormFields
					initialAssets={initialAssets}
					isPublished={person.isPublished}
					person={person}
					showSlug={false}
				/>

				<Button className="self-start" isPending={isPending} type="submit">
					{isPending ? (
						<Fragment>
							<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
							<span aria-hidden={true}>{t("Saving...")}</span>
						</Fragment>
					) : (
						t("Save")
					)}
				</Button>

				<FormStatus className="self-start" state={state} />
			</Form>
		</FormLayout>
	);
}
