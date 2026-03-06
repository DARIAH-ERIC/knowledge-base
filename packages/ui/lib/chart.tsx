import {
	type ComponentProps,
	type ComponentType,
	createContext,
	type HTMLAttributes,
	type ReactElement,
	type ReactNode,
	use,
	useCallback,
	useId,
	useMemo,
	useState,
} from "react";
import {
	ToggleButton,
	ToggleButtonGroup,
	type ToggleButtonGroupProps,
} from "react-aria-components";
import {
	CartesianGrid as CartesianGridPrimitive,
	type CartesianGridProps as CartesianGridPrimitiveProps,
	type CartesianGridProps,
	Legend as LegendPrimitive,
	type LegendPayload,
	type LegendProps,
	ResponsiveContainer,
	Tooltip as TooltipPrimitive,
	XAxis as XAxisPrimitive,
	type XAxisProps as XAxisPropsPrimitive,
	YAxis as YAxisPrimitive,
	type YAxisProps as YAxisPrimitiveProps,
} from "recharts";
import type { ContentType as LegendContentType } from "recharts/types/component/DefaultLegendContent";
import type {
	NameType,
	Props as TooltipContentProps,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import type { ContentType as TooltipContentType } from "recharts/types/component/Tooltip";
import { twJoin, twMerge } from "tailwind-merge";

import { cx } from "@/lib/primitive";

type ChartType = "default" | "stacked" | "percent";
type ChartLayout = "horizontal" | "vertical" | "radial";
type IntervalType = "preserveStartEnd" | "equidistantPreserveStart";

export type ChartConfig = Record<
	string,
	{
		label?: ReactNode;
		icon?: ComponentType;
	} & (
		| { color?: ChartColorKeys | (string & {}); theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	)
>;

const CHART_COLORS = {
	"chart-1": "var(--chart-1)",
	"chart-2": "var(--chart-2)",
	"chart-3": "var(--chart-3)",
	"chart-4": "var(--chart-4)",
	"chart-5": "var(--chart-5)",
} as const;

export type ChartColorKeys = keyof typeof CHART_COLORS | (string & {});

export const DEFAULT_COLORS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"] as const;

interface ChartContextProps {
	config: ChartConfig;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data?: Array<Record<string, any>>;
	layout: ChartLayout;
	dataKey?: string;
	selectedLegend: string | null;
	onLegendSelect: (legendItem: string | null) => void;
}

const ChartContext = createContext<ChartContextProps | null>(null);

export function useChart(): ChartContextProps {
	const context = use(ChartContext);

	if (!context) {
		throw new Error("useChart must be used within a <Chart />");
	}

	return context;
}

export function valueToPercent(value: number): string {
	return `${(value * 100).toFixed(0)}%`;
}

export const constructCategoryColors = (
	categories: Array<string>,
	colors: ReadonlyArray<ChartColorKeys>,
): Map<string, ChartColorKeys> => {
	const categoryColors = new Map<string, ChartColorKeys>();

	for (const [index, category] of categories.entries()) {
		const color = colors[index % colors.length];
		if (color !== undefined) {
			categoryColors.set(category, color);
		}
	}

	return categoryColors;
};

export const getColorValue = (color?: string): string => {
	if (color == null) {
		return "var(--chart-1)";
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	return CHART_COLORS[color as "chart-1"] ?? color;
};

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
	if (typeof payload !== "object" || payload === null) {
		return undefined;
	}

	const payloadPayload =
		"payload" in payload && typeof payload.payload === "object" && payload.payload !== null
			? payload.payload
			: undefined;

	let configLabelKey: string = key;

	if (key in payload && typeof payload[key as keyof typeof payload] === "string") {
		configLabelKey = payload[key as keyof typeof payload] as string;
	} else if (
		payloadPayload &&
		key in payloadPayload &&
		typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
	) {
		configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string;
	}

	return configLabelKey in config ? config[configLabelKey] : config[key];
}

export interface BaseChartProps<
	TValue extends ValueType,
	TName extends NameType,
> extends HTMLAttributes<HTMLDivElement> {
	config: ChartConfig;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: Array<Record<string, any>>;
	dataKey: string;
	colors?: ReadonlyArray<ChartColorKeys | (string & {})>;
	type?: ChartType;
	intervalType?: IntervalType;
	layout?: ChartLayout;
	valueFormatter?: (value: number) => string;

	tooltip?: TooltipContentType<TValue, TName> | boolean;
	tooltipProps?: Omit<ChartTooltipProps<TValue, TName>, "content"> & {
		hideLabel?: boolean;
		labelSeparator?: boolean;
		hideIndicator?: boolean;
		indicator?: "line" | "dot" | "dashed";
		nameKey?: string;
		labelKey?: string;
	};

	cartesianGridProps?: CartesianGridProps;

	legend?: LegendContentType | boolean;
	legendProps?: Omit<ComponentProps<typeof LegendPrimitive>, "content" | "ref">;

	xAxisProps?: XAxisPropsPrimitive;
	yAxisProps?: YAxisPrimitiveProps;

	// XAxis
	displayEdgeLabelsOnly?: boolean;

	hideGridLines?: boolean;
	hideXAxis?: boolean;
	hideYAxis?: boolean;
}

export function Chart({
	id,
	className,
	children,
	config,
	data,
	dataKey,
	ref,
	layout = "horizontal",
	...props
}: Readonly<
	Omit<ComponentProps<"div">, "children"> &
		Pick<ChartContextProps, "data" | "dataKey"> & {
			config: ChartConfig;
			layout?: ChartLayout;
			children: ReactElement | ((props: ChartContextProps) => ReactElement);
		}
>): ReactNode {
	const uniqueId = useId();
	const chartId = useMemo(() => {
		return `chart-${id ?? uniqueId.replaceAll(":", "")}`;
	}, [id, uniqueId]);

	const [selectedLegend, setSelectedLegend] = useState<string | null>(null);

	const onLegendSelect = useCallback((legendItem: string | null) => {
		setSelectedLegend(legendItem);
	}, []);

	const _data = data ?? [];
	const _dataKey = dataKey ?? "value";

	const value = {
		config,
		selectedLegend,
		onLegendSelect,
		data: _data,
		dataKey: _dataKey,
		layout,
	};

	return (
		<ChartContext value={value}>
			<div
				ref={ref}
				className={twMerge(
					"z-20 flex w-full justify-center text-xs",
					"[&_.recharts-cartesian-axis-tick_text]:fill-muted-fg [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/80 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
					// dot
					"[&_.recharts-dot[fill='#fff']]:fill-(--line-color)",
					// when hover over the line chart, the active dot should not have a fill or stroke
					"[&_.recharts-active-dot>.recharts-dot]:stroke-fg/10",
					className,
				)}
				data-chart={chartId}
				{...props}
			>
				<ChartStyle config={config} id={chartId} />
				<ResponsiveContainer height="100%" width="100%">
					{typeof children === "function" ? children(value) : children}
				</ResponsiveContainer>
			</div>
		</ChartContext>
	);
}

const THEMES = { light: "", dark: ".dark" } as const;

function ChartStyle({ id, config }: Readonly<{ id: string; config: ChartConfig }>): ReactNode {
	// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
	const colorConfig = Object.entries(config).filter(([_, config]) => {
		return config.theme ?? config.color;
	});

	if (colorConfig.length === 0) {
		return null;
	}

	return (
		<style
			dangerouslySetInnerHTML={{
				__html: Object.entries(THEMES)
					.map(([theme, prefix]) => {
						return `
${prefix} [data-chart=${id}] {
${colorConfig
	.map(([key, itemConfig]) => {
		const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ?? itemConfig.color;
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		return color ? `  --color-${key}: ${color};` : null;
	})
	.join("\n")}
}
`;
					})
					.join("\n"),
			}}
		/>
	);
}

type ChartTooltipProps<TValue extends ValueType, TName extends NameType> = ComponentProps<
	typeof TooltipPrimitive<TValue, TName>
>;

export function ChartTooltip<TValue extends ValueType, TName extends NameType>(
	props: Readonly<ChartTooltipProps<TValue, TName>>,
): ReactNode {
	const { layout } = useChart();

	return (
		<TooltipPrimitive
			animationDuration={500}
			cursor={{
				stroke: "var(--muted)",
				strokeWidth: layout === "radial" ? 0.1 : 1,
				fill: "var(--muted)",
				fillOpacity: 0.5,
			}}
			isAnimationActive={true}
			offset={10}
			wrapperStyle={{ outline: "none" }}
			{...props}
		/>
	);
}

type ChartLegendProps = Omit<ComponentProps<typeof LegendPrimitive>, "ref">;

export function ChartLegend(props: Readonly<ChartLegendProps>): ReactNode {
	return <LegendPrimitive align="center" verticalAlign="bottom" {...props} />;
}

interface XAxisProps extends Omit<XAxisPropsPrimitive, "ref"> {
	displayEdgeLabelsOnly?: boolean;
	intervalType?: IntervalType;
}

export function XAxis({
	displayEdgeLabelsOnly,
	className,
	intervalType = "preserveStartEnd",
	minTickGap = 5,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	domain = ["auto", "auto"],
	...props
}: Readonly<XAxisProps>): ReactNode {
	const { dataKey, data, layout } = useChart();

	const ticks =
		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		displayEdgeLabelsOnly && data?.length && dataKey
			? [data[0]?.[dataKey], data.at(-1)?.[dataKey]]
			: undefined;

	const tick = {
		transform: layout === "horizontal" ? "translate(32, 6)" : undefined,
	};
	return (
		<XAxisPrimitive
			axisLine={false}
			className={twMerge("text-muted-fg text-xs **:[text]:fill-muted-fg", className)}
			dataKey={layout === "horizontal" ? dataKey : undefined}
			interval={(displayEdgeLabelsOnly ?? false) ? "preserveStartEnd" : intervalType}
			minTickGap={minTickGap}
			tick={tick}
			tickLine={false}
			ticks={ticks}
			{...props}
		/>
	);
}

export function YAxis({
	className,
	width,
	domain = ["auto", "auto"],
	type,
	...props
}: Readonly<Omit<YAxisPrimitiveProps, "ref">>): ReactNode {
	const { layout, dataKey } = useChart();

	return (
		<YAxisPrimitive
			axisLine={false}
			className={twMerge("text-muted-fg text-xs **:[text]:fill-muted-fg", className)}
			dataKey={layout === "horizontal" ? undefined : dataKey}
			domain={domain}
			interval={layout === "horizontal" ? undefined : "equidistantPreserveStart"}
			tick={{
				transform: layout === "horizontal" ? "translate(-3, 0)" : "translate(0, 0)",
			}}
			tickLine={false}
			type={type || layout === "horizontal" ? "number" : "category"}
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			width={(width ?? layout === "horizontal") ? 40 : 80}
			{...props}
		/>
	);
}

export function CartesianGrid({
	className,
	...props
}: Readonly<CartesianGridPrimitiveProps>): ReactNode {
	const { layout } = useChart();
	return (
		<CartesianGridPrimitive
			className={twMerge("stroke-1 stroke-muted", className)}
			horizontal={layout !== "vertical"}
			vertical={layout === "vertical"}
			{...props}
		/>
	);
}

export function ChartTooltipContent<TValue extends ValueType, TName extends NameType>({
	payload,
	className,
	indicator = "dot",
	hideLabel = false,
	hideIndicator = false,
	label,
	labelSeparator = true,
	labelFormatter,
	labelClassName,
	formatter,
	color,
	nameKey,
	labelKey,
	ref,
}: Readonly<
	TooltipContentProps<TValue, TName> &
		ComponentProps<"div"> & {
			hideLabel?: boolean;
			labelSeparator?: boolean;
			hideIndicator?: boolean;
			indicator?: "line" | "dot" | "dashed";
			nameKey?: string;
			labelKey?: string;
		}
>): ReactNode {
	const { config } = useChart();

	const tooltipLabel = useMemo(() => {
		if (hideLabel || payload?.length == null) {
			return null;
		}

		const [item] = payload;

		if (!item) {
			return null;
		}

		// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
		const key = `${labelKey ?? item.dataKey ?? item.name ?? "value"}`;
		const itemConfig = getPayloadConfigFromPayload(config, item, key);
		const value =
			// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
			!labelKey && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label;

		if (labelFormatter) {
			return <div className={labelClassName}>{labelFormatter(value, payload)}</div>;
		}

		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (!value) {
			return null;
		}

		return <div className={labelClassName}>{value}</div>;
	}, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

	if (payload?.length == null) {
		return null;
	}

	const nestLabel = payload.length === 1 && indicator !== "dot";

	return (
		<div
			ref={ref}
			className={twMerge(
				"grid min-w-48 items-start rounded-lg bg-overlay/70 p-3 py-2 text-overlay-fg text-xs ring ring-current/10 backdrop-blur-lg",
				className,
			)}
		>
			{!hideLabel && (
				<>
					{!nestLabel ? <span className="font-medium">{tooltipLabel}</span> : null}
					{labelSeparator && (
						<span aria-hidden={true} className="mt-2 mb-3 block h-px w-full bg-bg/10" />
					)}
				</>
			)}
			<div className="grid gap-3">
				{payload.map((item, index) => {
					// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
					const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
					const itemConfig = getPayloadConfigFromPayload(config, item, key);
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
					const indicatorColor = color ?? item.payload.fill ?? item.color;

					return (
						<div
							key={key}
							className={twMerge(
								"flex w-full flex-wrap items-stretch gap-2 *:data-[slot=icon]:text-muted-fg",
								indicator === "dot" && "items-center *:data-[slot=icon]:size-2.5",
								indicator === "line" && "*:data-[slot=icon]:h-full *:data-[slot=icon]:w-2.5",
							)}
						>
							{/* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition */}
							{formatter && item?.value !== undefined && item.name ? (
								// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
								formatter(item.value, item.name, item, index, item.payload)
							) : (
								<>
									{itemConfig?.icon ? (
										<itemConfig.icon />
									) : (
										!hideIndicator && (
											<div
												className={twMerge(
													"shrink-0 rounded-full border-border bg-bg",
													indicator === "dot" && "size-2.5",
													indicator === "line" && "w-1",
													indicator === "dashed" &&
														"w-0 border-[1.5px] border-dashed bg-transparent",
													nestLabel && indicator === "dashed" && "my-0.5",
												)}
												style={{
													// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
													"--color-bg": indicatorColor,
													// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
													"--color-border": indicatorColor,
												}}
											/>
										)
									)}
									<div
										className={twMerge(
											"flex flex-1 justify-between leading-none",
											nestLabel ? "items-end" : "items-center",
										)}
									>
										<div className="grid gap-1.5">
											{nestLabel ? tooltipLabel : null}
											<span className="text-muted-fg">{itemConfig?.label ?? item.name}</span>
										</div>

										{item.value != null && (
											<span className="font-medium font-mono text-fg tabular-nums">
												{item.value.toString()}
											</span>
										)}
									</div>
								</>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

type ChartLegendContentProps = ToggleButtonGroupProps &
	Pick<LegendProps, "align" | "verticalAlign"> & {
		payload?: ReadonlyArray<LegendPayload>;
		hideIcon?: boolean;
		nameKey?: string;
	};

export function ChartLegendContent({
	className,
	hideIcon = false,
	payload,
	align = "right",
	verticalAlign = "bottom",
	nameKey,
}: Readonly<ChartLegendContentProps>): ReactNode {
	const { config, selectedLegend, onLegendSelect } = useChart();

	if (payload?.length == null) {
		return null;
	}

	return (
		<ToggleButtonGroup
			className={cx(
				twJoin(
					"flex flex-wrap items-center gap-x-1",
					verticalAlign === "top" ? "pb-3" : "pt-3",
					align === "right" ? "justify-end" : align === "left" ? "justify-start" : "justify-center",
				),
				className,
			)}
			onSelectionChange={(v) => {
				const key = [...v][0]?.toString() ?? null;
				onLegendSelect(key);
			}}
			selectedKeys={selectedLegend != null ? [selectedLegend] : undefined}
			selectionMode="single"
		>
			{payload.map((item: LegendPayload) => {
				// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
				const key = `${nameKey ?? item.dataKey ?? "value"}`;
				const itemConfig = getPayloadConfigFromPayload(config, item, key);

				return (
					<ToggleButton
						key={key}
						aria-label={"Legend Item"}
						className={twMerge(
							"flex items-center gap-2 rounded-sm px-2 py-1 text-muted-fg *:data-[slot=icon]:-mx-0.5 *:data-[slot=icon]:size-2.5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:text-muted-fg",
							"selected:bg-secondary/70 selected:text-secondary-fg",
							"hover:bg-secondary/70 hover:text-secondary-fg",
						)}
						id={key}
					>
						{itemConfig?.icon && !hideIcon ? (
							<itemConfig.icon data-slot="icon" />
						) : (
							<div
								className="rounded-full"
								data-slot="icon"
								style={{
									backgroundColor: item.color,
								}}
							/>
						)}
						{itemConfig?.label}
					</ToggleButton>
				);
			})}
		</ToggleButtonGroup>
	);
}
