"use client";

import { Heading } from "@dariah-eric/ui/heading";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode } from "react";

import { UserForm } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_components/user-form";
import { createUserAction } from "@/app/(app)/[locale]/(dashboard)/dashboard/administrator/users/_lib/create-user.action";

export function UserCreateForm(): ReactNode {
	const t = useExtracted();

	return (
		<Fragment>
			<Heading>{t("New user")}</Heading>

			<UserForm formAction={createUserAction} />
		</Fragment>
	);
}
