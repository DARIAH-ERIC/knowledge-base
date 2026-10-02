import { AlertTriangleIcon } from "lucide-react";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface ActionErrorAlertProps {
	className?: string;
	message: string | null | undefined;
}

/** Inline error for a server action run outside a form, e.g. from a confirmation dialog. */
export function ActionErrorAlert(props: Readonly<ActionErrorAlertProps>): ReactNode {
	const { className, message } = props;

	if (message == null) {
		return null;
	}

	return (
		<p
			className={twMerge(
				"flex items-center gap-x-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger",
				className,
			)}
			role="alert"
		>
			<AlertTriangleIcon aria-hidden={true} className="shrink-0 block-4 inline-4" />
			{message}
		</p>
	);
}
