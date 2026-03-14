import { Breadcrumbs, BreadcrumbsItem } from "@dariah-eric/ui/breadcrumbs";
import { getExtracted } from "next-intl/server";
import { Fragment, type ReactNode } from "react";

interface BreadcrumbsSlotProps extends PageProps<"/[locale]/dashboard/[...segments]"> {}

export default async function BreadcrumbsSlot(
	props: Readonly<BreadcrumbsSlotProps>,
): Promise<ReactNode> {
	const { params } = props;

	const { segments } = await params;

	const t = await getExtracted();

	return (
		<Breadcrumbs>
			<BreadcrumbsItem className="hidden sm:flex" href="/dashboard">
				{t("Dashboard")}
			</BreadcrumbsItem>
			{segments.map((route, index) => {
				const href = `/dashboard/${segments.at(0)!}/${route}`;

				if (index === segments.length - 1) {
					return (
						<BreadcrumbsItem key={href} className="capitalize">
							{route.replaceAll("-", " ")}
						</BreadcrumbsItem>
					);
				}

				return (
					<Fragment key={href}>
						<BreadcrumbsItem className="capitalize" href={href}>
							{route}
						</BreadcrumbsItem>
					</Fragment>
				);
			})}
		</Breadcrumbs>
	);
}
