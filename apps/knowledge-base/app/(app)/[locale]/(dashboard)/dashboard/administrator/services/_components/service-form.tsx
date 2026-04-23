"use client";

import type * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Checkbox } from "@dariah-eric/ui/checkbox";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import {
	MultipleSelect,
	MultipleSelectContent,
	MultipleSelectItem,
} from "@dariah-eric/ui/multiple-select";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import {
	FormLayout,
	FormSection,
} from "@/app/(app)/[locale]/(dashboard)/dashboard/_components/form-section";
import type { ServerAction } from "@/lib/server/create-server-action";

interface ServiceFormProps {
	service?: Pick<
		schema.Service,
		| "id"
		| "name"
		| "sshocMarketplaceId"
		| "typeId"
		| "statusId"
		| "comment"
		| "dariahBranding"
		| "monitoring"
		| "privateSupplier"
	> & {
		ownerUnitIds: Array<string>;
		providerUnitIds: Array<string>;
	};
	serviceTypes: Array<Pick<schema.ServiceType, "id" | "type">>;
	serviceStatuses: Array<Pick<schema.ServiceStatus, "id" | "status">>;
	organisationalUnits: Array<Pick<schema.OrganisationalUnit, "id" | "name">>;
	formAction: ServerAction;
}

function formatServiceType(type: string): string {
	return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatServiceStatus(status: string): string {
	return status.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => {
		return c.toUpperCase();
	});
}

export function ServiceForm(props: Readonly<ServiceFormProps>): ReactNode {
	const { service, serviceTypes, serviceStatuses, organisationalUnits, formAction } = props;

	const t = useExtracted();

	const [state, action, isPending] = useActionState(formAction, createActionStateInitial());

	const [selectedTypeId, setSelectedTypeId] = useState<string>(service?.typeId ?? "");
	const [selectedStatusId, setSelectedStatusId] = useState<string>(service?.statusId ?? "");
	const [selectedOwnerUnitIds, setSelectedOwnerUnitIds] = useState<Array<string>>(
		service?.ownerUnitIds ?? [],
	);
	const [selectedProviderUnitIds, setSelectedProviderUnitIds] = useState<Array<string>>(
		service?.providerUnitIds ?? [],
	);

	return (
		<FormLayout>
			<Form action={action} className="flex flex-col gap-y-6" state={state}>
				<FormSection description={t("Enter the service details.")} title={t("Details")}>
					<TextField defaultValue={service?.name} isRequired={true} name="name">
						<Label>{t("Name")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<Select
						isRequired={true}
						onChange={(key) => {
							setSelectedTypeId(String(key));
						}}
						value={selectedTypeId || null}
					>
						<Label>{t("Type")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							{serviceTypes.map((type) => {
								return (
									<SelectItem key={type.id} id={type.id}>
										{formatServiceType(type.type)}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
					<input name="typeId" type="hidden" value={selectedTypeId} />

					<Select
						isRequired={true}
						onChange={(key) => {
							setSelectedStatusId(String(key));
						}}
						value={selectedStatusId || null}
					>
						<Label>{t("Status")}</Label>
						<SelectTrigger />
						<FieldError />
						<SelectContent>
							{serviceStatuses.map((status) => {
								return (
									<SelectItem key={status.id} id={status.id}>
										{formatServiceStatus(status.status)}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>
					<input name="statusId" type="hidden" value={selectedStatusId} />

					<TextField
						defaultValue={service?.sshocMarketplaceId ?? undefined}
						name="sshocMarketplaceId"
					>
						<Label>{t("SSHOC Marketplace ID")}</Label>
						<Input />
						<FieldError />
					</TextField>

					<TextField defaultValue={service?.comment ?? undefined} name="comment">
						<Label>{t("Comment")}</Label>
						<TextArea />
						<FieldError />
					</TextField>
				</FormSection>

				<Separator className="my-6" />

				<FormSection description={t("Configure service flags.")} title={t("Flags")}>
					<Checkbox
						defaultSelected={service?.dariahBranding ?? false}
						name="dariahBranding"
						value="true"
					>
						{t("DARIAH branding")}
					</Checkbox>

					<Checkbox defaultSelected={service?.monitoring ?? false} name="monitoring" value="true">
						{t("Monitoring")}
					</Checkbox>

					<Checkbox
						defaultSelected={service?.privateSupplier ?? false}
						name="privateSupplier"
						value="true"
					>
						{t("Private supplier")}
					</Checkbox>
				</FormSection>

				<Separator className="my-6" />

				<FormSection
					description={t("Link organisational units as service owners or providers.")}
					title={t("Organisational units")}
				>
					<MultipleSelect
						aria-label={t("Service owners")}
						onChange={(keys) => {
							setSelectedOwnerUnitIds(keys.map(String));
						}}
						placeholder={t("No service owners")}
						value={selectedOwnerUnitIds}
					>
						<Label>{t("Service owners")}</Label>
						<MultipleSelectContent items={organisationalUnits}>
							{(item) => {
								return (
									<MultipleSelectItem key={item.id} id={item.id}>
										{item.name}
									</MultipleSelectItem>
								);
							}}
						</MultipleSelectContent>
					</MultipleSelect>
					{selectedOwnerUnitIds.map((id) => {
						return <input key={id} name="ownerUnitIds" type="hidden" value={id} />;
					})}

					<MultipleSelect
						aria-label={t("Service providers")}
						onChange={(keys) => {
							setSelectedProviderUnitIds(keys.map(String));
						}}
						placeholder={t("No service providers")}
						value={selectedProviderUnitIds}
					>
						<Label>{t("Service providers")}</Label>
						<MultipleSelectContent items={organisationalUnits}>
							{(item) => {
								return (
									<MultipleSelectItem key={item.id} id={item.id}>
										{item.name}
									</MultipleSelectItem>
								);
							}}
						</MultipleSelectContent>
					</MultipleSelect>
					{selectedProviderUnitIds.map((id) => {
						return <input key={id} name="providerUnitIds" type="hidden" value={id} />;
					})}
				</FormSection>

				{service != null && <input name="id" type="hidden" value={service.id} />}

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
