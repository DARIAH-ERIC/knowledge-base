import { Description } from "@dariah-eric/ui/field";
import { createContext, Fragment, type ReactNode, use } from "react";
import { twMerge } from "tailwind-merge";

type FormLayoutVariant = "two-column" | "stacked";

const FormLayoutContext = createContext<FormLayoutVariant>("two-column");

interface FormLayoutProps extends React.ComponentProps<"div"> {
	variant?: FormLayoutVariant;
}

export function FormLayout({
	variant = "two-column",
	children,
	className,
	...props
}: Readonly<FormLayoutProps>): ReactNode {
	return (
		<FormLayoutContext value={variant}>
			<div className={className} {...props}>
				{children}
			</div>
		</FormLayoutContext>
	);
}

interface FormSectionProps extends React.ComponentProps<"section"> {
	title?: string;
	description?: string;
	variant?: FormLayoutVariant;
}

export function FormSection({
	title,
	description,
	children,
	className,
	variant: variantProp,
	...props
}: Readonly<FormSectionProps>): ReactNode {
	const contextVariant = use(FormLayoutContext);
	const variant = variantProp ?? contextVariant;

	if (variant === "stacked") {
		return (
			<section className={twMerge("flex flex-col gap-y-6 max-w-3xl", className)} {...props}>
				{title != null || description != null ? (
					<div className="space-y-1">
						{title != null ? <FormSectionTitle title={title} /> : null}
						{description != null ? <Description>{description}</Description> : null}
					</div>
				) : null}
				{children}
			</section>
		);
	}

	return (
		<section
			className={twMerge("grid gap-x-8 gap-y-6 max-w-3xl sm:grid-cols-2", className)}
			{...props}
		>
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

interface FormActionsProps extends React.ComponentProps<"div"> {}

export function FormActions({
	children,
	className,
	...props
}: Readonly<FormActionsProps>): ReactNode {
	return (
		<div
			className={twMerge("flex w-full max-w-3xl items-center justify-end gap-x-4", className)}
			{...props}
		>
			{children}
		</div>
	);
}
