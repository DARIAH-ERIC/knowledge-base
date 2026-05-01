"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Checkbox } from "@dariah-eric/ui/checkbox";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { TextField } from "@dariah-eric/ui/text-field";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import { ContributionOptionPicker } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/contributions/_components/contribution-option-picker";
import type { ServerAction } from "@/lib/server/create-server-action";

type ActorType = "none" | "person" | "country";

interface UserFormProps {
	canCurrentUserManageAdmins: boolean;
	user?: Pick<schema.User, "id" | "name" | "email" | "role"> & {
		canManageAdmins: boolean;
		person: { id: string; name: string } | null;
		organisationalUnit: { id: string; name: string } | null;
	};
	formAction: ServerAction;
}

export function UserForm(props: Readonly<UserFormProps>): ReactNode {
	const { canCurrentUserManageAdmins, user, formAction } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedRole, setSelectedRole] = useState<string>(user?.role ?? "user");

	const initialActorType: ActorType =
		user?.person != null ? "person" : user?.organisationalUnit != null ? "country" : "none";

	const [actorType, setActorType] = useState<ActorType>(initialActorType);
	const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string } | null>(
		user?.person ?? null,
	);
	const [selectedCountry, setSelectedCountry] = useState<{ id: string; name: string } | null>(
		user?.organisationalUnit ?? null,
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection>
					<TextField defaultValue={user?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={user?.email} isRequired={true} name="email" type="email">
						<Label>{t("Email")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<Select
						isRequired={true}
						onChange={(key) => {
							setSelectedRole(String(key));
						}}
						value={selectedRole}
					>
						<Label>{t("Role")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							<SelectItem id="user">{t("User")}</SelectItem>
							<SelectItem id="admin">{t("Admin")}</SelectItem>
						</SelectContent>
					</Select>
					<input name="role" type="hidden" value={selectedRole} />

					{canCurrentUserManageAdmins && selectedRole === "admin" ? (
						<Checkbox
							defaultSelected={user?.canManageAdmins ?? false}
							name="canManageAdmins"
							value="true"
						>
							{t("Can manage other admin users")}
						</Checkbox>
					) : null}

					{user == null && (
						<TextField isRequired={true} name="password" type="password">
							<Label>{t("Password")}</Label>
							<Input />
							<FieldError />
						</TextField>
					)}

					{user != null && <input name="id" type="hidden" value={user.id} />}
				</FormSection>

				<FormSection title={t("Actor link")}>
					<Select
						onChange={(key) => {
							setActorType(key as ActorType);
							setSelectedPerson(null);
							setSelectedCountry(null);
						}}
						value={actorType}
					>
						<Label>{t("Link to")}</Label>
						<SelectTrigger />
						<SelectContent>
							<SelectItem id="none">{t("None")}</SelectItem>
							<SelectItem id="person">{t("Person")}</SelectItem>
							<SelectItem id="country">{t("Country")}</SelectItem>
						</SelectContent>
					</Select>

					{actorType === "person" && (
						<ContributionOptionPicker
							emptyMessage={t("No persons found.")}
							label={t("Person")}
							onSelect={setSelectedPerson}
							placeholder={t("Select a person")}
							resource="persons"
							selectedItem={selectedPerson}
						/>
					)}

					{actorType === "country" && (
						<ContributionOptionPicker
							emptyMessage={t("No countries found.")}
							label={t("Country")}
							onSelect={setSelectedCountry}
							placeholder={t("Select a country")}
							resource="countries"
							selectedItem={selectedCountry}
						/>
					)}

					<input
						name="personId"
						type="hidden"
						value={actorType === "person" ? (selectedPerson?.id ?? "") : ""}
					/>
					<input
						name="organisationalUnitId"
						type="hidden"
						value={actorType === "country" ? (selectedCountry?.id ?? "") : ""}
					/>
				</FormSection>

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
