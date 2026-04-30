"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UserForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_components/user-form";
import { createUserAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/create-user.action";

interface UserCreateFormProps {
	canCurrentUserManageAdmins: boolean;
}

export function UserCreateForm(props: Readonly<UserCreateFormProps>): ReactNode {
	const { canCurrentUserManageAdmins } = props;
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New user")}</Heading>

			<UserForm
				canCurrentUserManageAdmins={canCurrentUserManageAdmins}
				formAction={createUserAction}
			/>
		</Fragment>
	);
}
