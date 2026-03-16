import { Description } from "@dariah-eric/ui/field";
import { Fragment, type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface FormSectionProps extends React.ComponentProps<"section"> {
	title?: string;
	description?: string;
}

export function FormSection({
	title,
	description,
	children,
	className,
	...props
}: Readonly<FormSectionProps>): ReactNode {
	return (
		<section className={twMerge("grid gap-x-8 gap-y-6 sm:grid-cols-2", className)} {...props}>
			{title != null || description != null ? (
				<Fragment>
					<div className="space-y-1">
						{title != null ? <FormSectionTitle title={title} /> : null}
						{description != null ? <Description>{description}</Description> : null}
					</div>
					<div className="flex flex-col gap-y-6">{children}</div>
				</Fragment>
			) : (
				children
			)}
		</section>
	);
}

interface FormSectionTitleProps
	extends Pick<FormSectionProps, "title">, React.ComponentProps<"h2"> {}

export function FormSectionTitle({
	title,
	className,
	children,
	...props
}: Readonly<FormSectionTitleProps>): ReactNode {
	return (
		<h2 className={twMerge("font-semibold text-base/7 text-fg sm:text-sm/6", className)} {...props}>
			{title ?? children}
		</h2>
	);
}

interface FormSectionDescription
	extends Pick<FormSectionProps, "description">, React.ComponentProps<typeof Description> {}

export function FormSectionDescription({
	description,
	children,
	...props
}: Readonly<FormSectionDescription>): ReactNode {
	return <Description {...props}>{description ?? children}</Description>;
}
