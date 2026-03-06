"use client";

import { type ComponentProps, Fragment, type ReactNode, useId } from "react";
import { Area, AreaChart as AreaChartPrimitive } from "recharts";
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

interface AreaChartProps<TValue extends ValueType, TName extends NameType> extends BaseChartProps<
	TValue,
	TName
> {
	chartProps?: Omit<ComponentProps<typeof AreaChartPrimitive>, "data" | "stackOffset">;
	areaProps?: Partial<ComponentProps<typeof Area>>;
	connectNulls?: boolean;
	fillType?: "gradient" | "solid" | "none";
}

export function AreaChart<TValue extends ValueType, TName extends NameType>({
	data,
	dataKey,
	colors = DEFAULT_COLORS,
	connectNulls = false,
	type = "default",
	className,

	fillType = "gradient",
	config,
	children,

	areaProps,

	// Components
	tooltip = true,
	tooltipProps,

	cartesianGridProps,

	legend = true,
	legendProps,

	intervalType = "equidistantPreserveStart",

	valueFormatter = (value: number) => {
		return value.toString();
	},

	// XAxis
	displayEdgeLabelsOnly = false,
	hideXAxis = false,
	xAxisProps,

	// YAxis
	hideYAxis = false,
	yAxisProps,

	hideGridLines = false,
	chartProps,
	...props
}: Readonly<AreaChartProps<TValue, TName>>): ReactNode {
	const categoryColors = constructCategoryColors(Object.keys(config), colors);
	const stacked = type === "stacked" || type === "percent";
	const areaId = useId();
	const getFillContent = ({
		fillType,
		activeLegend,
		category,
	}: {
		fillType: AreaChartProps<TValue, TName>["fillType"];
		activeLegend: string | null;
		category: string;
	}) => {
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		const stopOpacity = activeLegend && activeLegend !== category ? 0.1 : 0.5;

		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		switch (fillType) {
			case "none": {
				return <stop stopColor="currentColor" stopOpacity={0} />;
			}

			case "gradient": {
				return (
					<Fragment>
						<stop offset="5%" stopColor="currentColor" stopOpacity={stopOpacity} />
						<stop offset="95%" stopColor="currentColor" stopOpacity={0} />
					</Fragment>
				);
			}

			default: {
				return <stop stopColor="currentColor" stopOpacity={stopOpacity} />;
			}
		}
	};

	return (
		<Chart
			className={twMerge("h-56 w-full", className)}
			config={config}
			data={data}
			dataKey={dataKey}
			{...props}
		>
			{({ onLegendSelect, selectedLegend }) => {
				return (
					<AreaChartPrimitive
						data={data}
						margin={{
							bottom: 0,
							left: 0,
							right: 0,
							top: 5,
						}}
						onClick={() => {
							onLegendSelect(null);
						}}
						stackOffset={type === "percent" ? "expand" : undefined}
						{...chartProps}
					>
						{!hideGridLines && <CartesianGrid {...cartesianGridProps} strokeDasharray="3 3" />}
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

						{/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
						{legend != null && (
							<ChartLegend
								content={typeof legend === "boolean" ? <ChartLegendContent /> : legend}
								{...legendProps}
							/>
						)}

						{/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
						{tooltip != null && (
							<ChartTooltip
								content={
									typeof tooltip === "boolean" ? (
										<ChartTooltipContent
											{...{
												hideIndicator: tooltipProps?.hideIndicator,
												hideLabel: tooltipProps?.hideLabel,
												cursor: tooltipProps?.cursor,
												indicator: tooltipProps?.indicator,
												labelSeparator: tooltipProps?.labelSeparator,
												formatter: tooltipProps?.formatter,
												labelFormatter: tooltipProps?.labelFormatter,
											}}
											accessibilityLayer={true}
										/>
									) : (
										tooltip
									)
								}
								{...tooltipProps}
							/>
						)}

						{children ??
							Object.entries(config).map(([category, values]) => {
								const categoryId = `${areaId}-${category.replaceAll(/[^a-z0-9]/gi, "")}`;

								// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
								const strokeOpacity = selectedLegend && selectedLegend !== category ? 0.1 : 1;

								return (
									<Fragment key={categoryId}>
										<defs>
											<linearGradient
												id={categoryId}
												style={{
													color: getColorValue(values.color ?? categoryColors.get(category)),
												}}
												x1="0"
												x2="0"
												y1="0"
												y2="1"
											>
												{getFillContent({
													fillType,
													activeLegend: selectedLegend,
													category,
												})}
											</linearGradient>
										</defs>
										<Area
											connectNulls={connectNulls}
											dataKey={category}
											dot={false}
											fill={`url(#${categoryId})`}
											isAnimationActive={true}
											name={category}
											stackId={stacked ? "stack" : undefined}
											stroke={getColorValue(values.color ?? categoryColors.get(category))}
											strokeLinecap="round"
											strokeLinejoin="round"
											style={{
												strokeWidth: 2,
												strokeOpacity,
											}}
											{...areaProps}
										/>
									</Fragment>
								);
							})}
					</AreaChartPrimitive>
				);
			}}
		</Chart>
	);
}
