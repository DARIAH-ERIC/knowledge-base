"use client";

import { type ActionState, createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { assetPrefixes } from "@dariah-eric/storage/config";
import { Button } from "@dariah-eric/ui/button";
import { FieldError, Label } from "@dariah-eric/ui/field";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { Input } from "@dariah-eric/ui/input";
import {
	ModalBody,
	ModalClose,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@dariah-eric/ui/modal";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { Separator } from "@dariah-eric/ui/separator";
import { TextField } from "@dariah-eric/ui/text-field";
import { TextArea } from "@dariah-eric/ui/textarea";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import { uploadImageAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/website/assets/_lib/upload-image.action";

interface UploadImageDialogProps {
	onSuccess: () => void;
}

export function UploadImageDialog(props: Readonly<UploadImageDialogProps>): ReactNode {
	const { onSuccess } = props;

	const t = useExtracted();

	const [isOpen, setIsOpen] = useState(false);
	const [filePreview, setFilePreview] = useState<string | null>(null);

	const [state, formAction, isPending] = useActionState(
		async (prevState: ActionState<{ key: string }>, formData: FormData) => {
			const result = await uploadImageAction(prevState, formData);
			if (result.status === "success") {
				setIsOpen(false);
				setFilePreview(null);
				onSuccess();
			}
			return result;
		},
		createActionStateInitial(),
	);

	return (
		<Fragment>
			<Button
				className="whitespace-nowrap"
				intent="secondary"
				onPress={() => {
					setIsOpen(true);
				}}
			>
				<ArrowUpTrayIcon className="mr-2 size-4" />
				{t("Upload image")}
			</Button>

			<ModalContent isOpen={isOpen} onOpenChange={setIsOpen} size="lg">
				<Form action={formAction} state={state}>
					<ModalHeader
						description={t("Upload a new image to the media library.")}
						title={t("Upload image")}
					/>

					<ModalBody className="flex flex-col gap-y-5">
						<FormStatus state={state} />

						<div className="flex flex-col gap-y-2">
							<label className="text-sm font-medium">
								{t("File")}
								<span aria-hidden={true} className="ml-0.5 text-danger">
									{"*"}
								</span>
							</label>
							<input
								accept="image/jpeg, image/png"
								className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-fg focus:outline-none hover:file:bg-secondary/80"
								name="file"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file != null) {
										if (filePreview != null) {
											URL.revokeObjectURL(filePreview);
										}
										setFilePreview(URL.createObjectURL(file));
									}
								}}
								required={true}
								type="file"
							/>
							{filePreview != null && (
								<img
									alt={t("Preview")}
									className="mt-1 size-24 rounded-lg object-cover"
									src={filePreview}
								/>
							)}
						</div>

						<Select defaultValue="images" isRequired={true} name="prefix">
							<Label>{t("Prefix")}</Label>
							<SelectTrigger />
							<FieldError />
							<SelectContent>
								{assetPrefixes.map((prefix) => {
									return (
										<SelectItem key={prefix} id={prefix}>
											{prefix}
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>

						<Separator />

						<TextField aria-label={t("Label")} name="label">
							<Label>{t("Label")}</Label>
							<Input placeholder={t("Defaults to file name")} />
							<FieldError />
						</TextField>

						<TextField aria-label={t("Alt text")} name="alt">
							<Label>{t("Alt text")}</Label>
							<Input placeholder={t("Describe the image for accessibility")} />
							<FieldError />
						</TextField>

						<TextField aria-label={t("Caption")} name="caption">
							<Label>{t("Caption")}</Label>
							<TextArea placeholder={t("Optional caption displayed below the image")} rows={2} />
							<FieldError />
						</TextField>
					</ModalBody>

					<ModalFooter>
						<ModalClose>{t("Cancel")}</ModalClose>

						<Button isPending={isPending} type="submit">
							{isPending ? (
								<Fragment>
									<ProgressCircle aria-label={t("Uploading...")} isIndeterminate={true} />
									<span aria-hidden={true}>{t("Uploading...")}</span>
								</Fragment>
							) : (
								t("Upload")
							)}
						</Button>
					</ModalFooter>
				</Form>
			</ModalContent>
		</Fragment>
	);
}
