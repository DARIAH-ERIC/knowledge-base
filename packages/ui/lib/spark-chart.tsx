"use client";

import { Fragment, type ReactNode, useId } from "react";
import {
	Area,
	AreaChart as AreaChartPrimitive,
	Bar,
	BarChart as BarChartPrimitive,
	Line,
	LineChart as LineChartPrimitive,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { ContentType } from "recharts/types/component/Tooltip";
import type { CurveType } from "recharts/types/shape/Curve";
import type { AxisDomain } from "recharts/types/util/types";
import { twMerge } from "tailwind-merge";

import {
	Chart,
	type ChartColorKeys,
	type ChartConfig,
	ChartTooltip,
	ChartTooltipContent,
	constructCategoryColors,
	DEFAULT_COLORS,
	getColorValue,
	XAxis,
	YAxis,
} from "@/lib/chart";

export type SparkChartType = "default" | "stacked" | "percent";

interface SparkBaseProps<
	TValue extends ValueType,
	TName extends NameType,
> extends React.HTMLAttributes<HTMLDivElement> {
	config: ChartConfig;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: Array<Record<string, any>>;
	dataKey: string;
	colors?: ReadonlyArray<ChartColorKeys>;
	yAxisDomain?: AxisDomain;
	type?: SparkChartType;
	tooltip?: ContentType<TValue, TName> | boolean;
}

export interface SparkAreaChartProps<
	TValue extends ValueType,
	TName extends NameType,
> extends SparkBaseProps<TValue, TName> {
	connectNulls?: boolean;
	fillType?: "gradient" | "solid" | "none";
	lineType?: CurveType;
	tooltipLabelSeparator?: boolean;
}

export function SparkAreaChart<TValue extends ValueType, TName extends NameType>({
	data,
	dataKey,
	colors = DEFAULT_COLORS,
	yAxisDomain = ["auto", "auto"],
	connectNulls = false,
	type = "default",
	className,
	fillType = "gradient",
	lineType = "natural",
	config,
	tooltip,
	tooltipLabelSeparator = false,
	...props
}: Readonly<SparkAreaChartProps<TValue, TName>>): ReactNode {
	const categoryColors = constructCategoryColors(Object.keys(config), colors);

	const stacked = type === "stacked" || type === "percent";
	const areaId = useId();

	const getFillContent = (fillType: SparkAreaChartProps<TValue, TName>["fillType"]) => {
		// eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
		switch (fillType) {
			case "none": {
				return <stop stopColor="currentColor" stopOpacity={0} />;
			}

			case "gradient": {
				return (
					<Fragment>
						<stop offset="5%" stopColor="currentColor" stopOpacity={0.5} />
						<stop offset="95%" stopColor="currentColor" stopOpacity={0.1} />
					</Fragment>
				);
			}

			case "solid": {
				return <stop stopColor="currentColor" stopOpacity={0.3} />;
			}

			default: {
				return <stop stopColor="currentColor" stopOpacity={0.3} />;
			}
		}
	};

	return (
		<Chart
			className={twMerge("h-12 w-28", className)}
			config={config}
			data={data}
			dataKey={dataKey}
			{...props}
		>
			<AreaChartPrimitive
				data={data}
				margin={{
					bottom: 0,
					left: 0,
					right: 0,
					top: 0,
				}}
				stackOffset={type === "percent" ? "expand" : undefined}
			>
				<XAxis dataKey={dataKey} hide={true} />
				<YAxis domain={yAxisDomain} hide={true} />
				{tooltip != null && (
					<ChartTooltip
						content={
							typeof tooltip === "boolean" ? (
								<ChartTooltipContent
									accessibilityLayer={true}
									hideLabel={true}
									labelSeparator={tooltipLabelSeparator}
								/>
							) : (
								tooltip
							)
						}
						cursor={false}
					/>
				)}

				{Object.entries(config).map(([category, values]) => {
					const categoryId = `${areaId}-${category.replaceAll(/[^a-z0-9]/gi, "")}`;
					return (
						<defs key={category}>
							<linearGradient
								key={category}
								id={categoryId}
								style={{
									color: getColorValue(values.color ?? categoryColors.get(category)),
								}}
								x1="0"
								x2="0"
								y1="0"
								y2="1"
							>
								{getFillContent(fillType)}
							</linearGradient>
						</defs>
					);
				})}

				{Object.entries(config).map(([category, values]) => {
					const categoryId = `${areaId}-${category.replaceAll(/[^a-z0-9]/gi, "")}`;
					return (
						<Area
							key={category}
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
							strokeOpacity={1}
							strokeWidth={2}
							type={lineType}
						/>
					);
				})}
			</AreaChartPrimitive>
		</Chart>
	);
}

export interface SparkLineChartProps<
	TValue extends ValueType,
	TName extends NameType,
> extends SparkBaseProps<TValue, TName> {
	connectNulls?: boolean;
}

export function SparkLineChart<TValue extends ValueType, TName extends NameType>({
	data,
	dataKey,
	colors = DEFAULT_COLORS,
	yAxisDomain = ["auto", "auto"],
	connectNulls = false,
	type = "default",
	className,
	config,
	tooltip,
	...props
}: Readonly<SparkLineChartProps<TValue, TName>>): ReactNode {
	const categoryColors = constructCategoryColors(Object.keys(config), colors);

	return (
		<Chart
			className={twMerge("h-12 w-28", className)}
			config={config}
			data={data}
			dataKey={dataKey}
			{...props}
		>
			<LineChartPrimitive
				data={data}
				margin={{
					bottom: 0,
					left: 0,
					right: 0,
					top: 0,
				}}
				stackOffset={type === "percent" ? "expand" : undefined}
			>
				<XAxis hide={true} />
				<YAxis domain={yAxisDomain} hide={true} />
				{tooltip != null && (
					<ChartTooltip
						content={
							typeof tooltip === "boolean" ? (
								<ChartTooltipContent accessibilityLayer={true} hideLabel={true} />
							) : (
								tooltip
							)
						}
						cursor={false}
					/>
				)}

				{Object.entries(config).map(([category, values]) => {
					return (
						<Line
							key={category}
							connectNulls={connectNulls}
							dataKey={category}
							dot={false}
							isAnimationActive={false}
							name={category}
							stroke={getColorValue(values.color ?? categoryColors.get(category))}
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeOpacity={1}
							strokeWidth={2}
							type="linear"
						/>
					);
				})}
			</LineChartPrimitive>
		</Chart>
	);
}

export interface SparkBarChartProps<
	TValue extends ValueType,
	TName extends NameType,
> extends SparkBaseProps<TValue, TName> {
	barCategoryGap?: string | number;
	barRadius?: number;
}

export function SparkBarChart<TValue extends ValueType, TName extends NameType>({
	data,
	dataKey,
	colors = DEFAULT_COLORS,
	yAxisDomain = ["auto", "auto"],
	barCategoryGap,
	type = "default",
	className,
	barRadius = 4,
	config,
	tooltip,
	...props
}: Readonly<SparkBarChartProps<TValue, TName>>): ReactNode {
	const categoryColors = constructCategoryColors(Object.keys(config), colors);

	const stacked = type === "stacked" || type === "percent";

	return (
		<Chart
			className={twMerge("h-12 w-28", className)}
			config={config}
			data={data}
			dataKey={dataKey}
			{...props}
		>
			<BarChartPrimitive
				barCategoryGap={barCategoryGap}
				data={data}
				margin={{
					bottom: 0,
					left: 0,
					right: 0,
					top: 0,
				}}
				stackOffset={type === "percent" ? "expand" : undefined}
			>
				<XAxis dataKey={dataKey} hide={true} />
				<YAxis domain={yAxisDomain} hide={true} />
				{tooltip != null && (
					<ChartTooltip
						content={
							typeof tooltip === "boolean" ? (
								<ChartTooltipContent accessibilityLayer={true} hideLabel={true} />
							) : (
								tooltip
							)
						}
						cursor={false}
					/>
				)}

				{Object.entries(config).map(([category, values]) => {
					return (
						<Bar
							key={category}
							dataKey={category}
							fill={getColorValue(values.color ?? categoryColors.get(category))}
							name={category}
							radius={barRadius}
							stackId={stacked ? "stack" : undefined}
							type="linear"
						/>
					);
				})}
			</BarChartPrimitive>
		</Chart>
	);
}
