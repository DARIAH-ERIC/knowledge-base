"use client";

import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { Button } from "@dariah-eric/ui/button";
import { Form } from "@dariah-eric/ui/form";
import { FormStatus } from "@dariah-eric/ui/form-status";
import { ProgressCircle } from "@dariah-eric/ui/progress-circle";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@dariah-eric/ui/select";
import { useExtracted } from "next-intl";
import { Fragment, type ReactNode, useActionState, useState } from "react";

import type { ReportServiceWithKpis, ServiceKpiCategory } from "@/lib/data/report-services";
import type { ServerAction } from "@/lib/server/create-server-action";

/** Id linking the per-service KPI inputs (rendered inside service cards) to the single Save form. */
const KPI_FORM_ID = "country-report-service-kpis-form";

function formatKpi(kpi: string): string {
	return kpi.replaceAll("_", " ").replaceAll(/\b\w/g, (c) => c.toUpperCase());
}

interface CountryReportServicesFormProps {
	reportId: string;
	services: Array<ReportServiceWithKpis>;
	kpiCategories: ReadonlyArray<ServiceKpiCategory>;
	saveKpisAction: ServerAction;
}

export function CountryReportServicesForm(
	props: Readonly<CountryReportServicesFormProps>,
): ReactNode {
	const { reportId, services, kpiCategories, saveKpisAction } = props;

	const t = useExtracted();
	const [saveState, saveAction, isSaving] = useActionState(
		saveKpisAction,
		createActionStateInitial(),
	);

	if (services.length === 0) {
		return <p className="text-sm text-muted-fg">{t("No services linked to this country.")}</p>;
	}

	return (
		<div className="flex flex-col gap-y-10">
			<div className="flex flex-col gap-y-2">
				<h2 className="text-sm font-semibold text-fg">{t("Services")}</h2>
				<p className="max-inline-md text-sm text-muted-fg">
					{t(
						"The services run by this country's consortium. Add the relevant metrics per service — you only need to fill in the numbers you have.",
					)}
				</p>
			</div>

			<ul className="flex flex-col gap-y-4">
				{services.map((service) => (
					<li key={service.id}>
						<ServiceCard kpiCategories={kpiCategories} service={service} />
					</li>
				))}
			</ul>

			{/* The KPI inputs live inside the service cards above and link to this form via its `form` id. */}
			<Form
				action={saveAction}
				className="flex flex-col gap-y-3"
				id={KPI_FORM_ID}
				state={saveState}
			>
				<input name="id" type="hidden" value={reportId} />
				<Button className="self-start" isPending={isSaving} type="submit">
					{isSaving ? (
						<Fragment>
							<ProgressCircle aria-label={t("Saving...")} isIndeterminate={true} />
							<span aria-hidden={true}>{t("Saving...")}</span>
						</Fragment>
					) : (
						t("Save metrics")
					)}
				</Button>
				<FormStatus className="self-start" state={saveState} />
			</Form>
		</div>
	);
}

interface ServiceCardProps {
	service: ReportServiceWithKpis;
	kpiCategories: ReadonlyArray<ServiceKpiCategory>;
}

interface MetricRow {
	kpi: ServiceKpiCategory;
	value: string;
}

function ServiceCard(props: Readonly<ServiceCardProps>): ReactNode {
	const { service, kpiCategories } = props;

	const t = useExtracted();
	const [metrics, setMetrics] = useState<Array<MetricRow>>(() =>
		service.kpis.map((kpi) => {
			return { kpi: kpi.kpi, value: String(kpi.value) };
		}),
	);

	const used = new Set(metrics.map((metric) => metric.kpi));
	const remaining = kpiCategories.filter((category) => !used.has(category));

	function addMetric(kpi: ServiceKpiCategory): void {
		setMetrics((current) => [...current, { kpi, value: "" }]);
	}

	function removeMetric(kpi: ServiceKpiCategory): void {
		setMetrics((current) => current.filter((metric) => metric.kpi !== kpi));
	}

	function setValue(kpi: ServiceKpiCategory, value: string): void {
		setMetrics((current) =>
			current.map((metric) => (metric.kpi === kpi ? { ...metric, value } : metric)),
		);
	}

	return (
		<div className="flex flex-col gap-y-4 rounded-md border border-border p-4">
			<p className="text-sm font-medium text-fg">{service.name}</p>

			{metrics.length > 0 && (
				<ul className="flex flex-col gap-y-2">
					{metrics.map((metric) => (
						<li key={metric.kpi} className="flex items-center gap-x-3">
							<label
								className="inline-40 shrink-0 text-sm text-fg"
								htmlFor={`${service.id}-${metric.kpi}`}
							>
								{formatKpi(metric.kpi)}
							</label>
							<input
								className="inline-32 rounded-md border border-border bg-bg px-2 py-1 text-sm text-fg"
								form={KPI_FORM_ID}
								id={`${service.id}-${metric.kpi}`}
								min={0}
								name={`kpis.${service.id}.${metric.kpi}`}
								onChange={(event) => {
									setValue(metric.kpi, event.target.value);
								}}
								type="number"
								value={metric.value}
							/>
							<Button
								intent="plain"
								onPress={() => {
									removeMetric(metric.kpi);
								}}
								size="sm"
							>
								{t("Remove")}
							</Button>
						</li>
					))}
				</ul>
			)}

			{remaining.length > 0 && (
				<Select
					aria-label={t("Add metric")}
					onChange={(key) => {
						if (key != null) {
							addMetric(String(key) as ServiceKpiCategory);
						}
					}}
					placeholder={t("Add metric")}
					value={null}
				>
					<SelectTrigger className="max-inline-3xs" />
					<SelectContent>
						{remaining.map((category) => (
							<SelectItem key={category} id={category}>
								{formatKpi(category)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	);
}
