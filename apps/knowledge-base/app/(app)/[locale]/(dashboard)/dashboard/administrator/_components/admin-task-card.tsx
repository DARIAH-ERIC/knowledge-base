"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@dariah-eric/ui/card";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { SubmitButton } from "@dariah-eric/ui/submit-button";
import { type ReactNode, useActionState } from "react";

import type { ServerAction } from "@/lib/server/create-server-action";

interface AdminTaskCardProps {
	actionLabel: string;
	description: string;
	formAction: ServerAction<void>;
	title: string;
}

export function AdminTaskCard(props: Readonly<AdminTaskCardProps>): ReactNode {
	const { actionLabel, description, formAction, title } = props;

	const [state, action] = useActionState(formAction, createActionStateInitial());

	return (
		<Card className="h-full">
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="grow">
				<FormStatus state={state} />
			</CardContent>
			<CardFooter>
				<Form action={action} state={state}>
					<SubmitButton>{actionLabel}</SubmitButton>
				</Form>
			</CardFooter>
		</Card>
	);
}
