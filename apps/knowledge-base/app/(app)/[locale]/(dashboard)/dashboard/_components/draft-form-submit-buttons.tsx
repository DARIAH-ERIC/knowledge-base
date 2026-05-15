"use client";

import { Button } from "@dariah-eric/ui/button";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { saveAndPublishIntent } from "@/lib/form-intent";

interface DraftFormSubmitButtonsProps {
	isDisabled?: boolean;
	isPending: boolean;
	showSaveAndPublish?: boolean;
}

export function DraftFormSubmitButtons(props: Readonly<DraftFormSubmitButtonsProps>): ReactNode {
	const { isDisabled, isPending, showSaveAndPublish = false } = props;
	const t = useExtracted();

	const pendingContent = (
		<Fragment>
			<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
			<span aria-hidden={true}>{t("Saving...")}</span>
		</Fragment>
	);

	return (
		<Fragment>
			<Button isDisabled={isDisabled} isPending={isPending} type="submit">
				{isPending ? pendingContent : showSaveAndPublish ? t("Save (as draft)") : t("Save")}
			</Button>
			{showSaveAndPublish ? (
				<Button
					intent="primary"
					isDisabled={isDisabled}
					isPending={isPending}
					name="intent"
					type="submit"
					value={saveAndPublishIntent}
				>
					{isPending ? pendingContent : t("Save and publish")}
				</Button>
			) : null}
		</Fragment>
	);
}
