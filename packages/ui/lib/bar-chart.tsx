"use client";

import { type ComponentProps, type ReactNode, startTransition } from "react";
import { Bar, BarChart as BarChartPrimitive } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { twMerge } from "tailwind-merge";

import {
	type BaseChartProps,
	CartesianGrid,
	Chart,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	constructCategoryColors,
	DEFAULT_COLORS,
	getColorValue,
	valueToPercent,
	XAxis,
	YAxis,
} from "./chart";

export interface BarChartProps<
	TValue extends ValueType,
	TName extends NameType,
> extends BaseChartProps<TValue, TName> {
	barCategoryGap?: number;
	barRadius?: number;
	barGap?: number;
	barSize?: number;
	barProps?: Partial<React.ComponentProps<typeof Bar>>;

	chartProps?: Omit<ComponentProps<typeof BarChartPrimitive>, "data" | "stackOffset">;
}

export function BarChart<TValue extends ValueType, TName extends NameType>({
	data,
	dataKey,
	colors = DEFAULT_COLORS,
	type = "default",
	className,
	config,
	children,
	layout = "horizontal",

	// Components
	tooltip = true,
	tooltipProps,

	legend = true,
	legendProps,

	intervalType = "equidistantPreserveStart",

	barCategoryGap = 5,
	barGap,
	barSize,
	barRadius,
	barProps,

	valueFormatter = (value: number) => {
		return value.toString();
	},

	// XAxis
	displayEdgeLabelsOnly = false,
	xAxisProps,
	hideXAxis = false,

	// YAxis
	yAxisProps,
	hideYAxis = false,

	hideGridLines = false,
	chartProps,
	...props
}: Readonly<BarChartProps<TValue, TName>>): ReactNode {
	const categoryColors = constructCategoryColors(Object.keys(config), colors);

	const stacked = type === "stacked" || type === "percent";
	return (
		<Chart
			className={twMerge("w-full", className)}
			config={config}
			data={data}
			dataKey={dataKey}
			layout={layout}
			{...props}
		>
			{({ onLegendSelect, selectedLegend }) => {
				return (
					<BarChartPrimitive
						barCategoryGap={barCategoryGap}
						barGap={barGap}
						barSize={barSize}
						data={data}
						layout={layout === "radial" ? "horizontal" : layout}
						margin={{
							bottom: 0,
							left: 5,
							right: 0,
							top: 5,
						}}
						onClick={() => {
							onLegendSelect(null);
						}}
						stackOffset={type === "percent" ? "expand" : stacked ? "sign" : undefined}
						{...chartProps}
					>
						{!hideGridLines && <CartesianGrid strokeDasharray="4 4" />}
						<XAxis
							className="**:[text]:fill-muted-fg"
							displayEdgeLabelsOnly={displayEdgeLabelsOnly}
							hide={hideXAxis}
							intervalType={intervalType}
							{...xAxisProps}
						/>
						<YAxis
							className="**:[text]:fill-muted-fg"
							hide={hideYAxis}
							tickFormatter={type === "percent" ? valueToPercent : valueFormatter}
							{...yAxisProps}
						/>

						{Boolean(legend) && (
							<ChartLegend
								content={typeof legend === "boolean" ? <ChartLegendContent /> : legend}
								{...legendProps}
							/>
						)}

						{Boolean(tooltip) && (
							<ChartTooltip
								content={
									typeof tooltip === "boolean" ? (
										<ChartTooltipContent accessibilityLayer={true} />
									) : (
										tooltip
									)
								}
								{...tooltipProps}
							/>
						)}

						{children ??
							Object.entries(config).map(([category, values]) => {
								return (
									<Bar
										key={category}
										dataKey={category}
										fill={getColorValue(values.color ?? categoryColors.get(category))}
										fillOpacity={selectedLegend !== null && selectedLegend !== category ? 0.1 : 1}
										name={category}
										onClick={(_item, _number, event) => {
											event.stopPropagation();

											startTransition(() => {
												onLegendSelect(category);
											});
										}}
										radius={barRadius ?? (stacked ? undefined : 4)}
										stackId={stacked ? "stack" : undefined}
										stroke={getColorValue(values.color ?? categoryColors.get(category))}
										strokeOpacity={selectedLegend !== null && selectedLegend !== category ? 0.2 : 0}
										strokeWidth={1}
										{...barProps}
									/>
								);
							})}
					</BarChartPrimitive>
				);
			}}
		</Chart>
	);
}
