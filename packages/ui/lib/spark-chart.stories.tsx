import type { Meta, StoryObj } from "@storybook/react-vite";

import type { ChartConfig } from "./chart";
import { SparkAreaChart, SparkBarChart, SparkLineChart } from "./spark-chart";

const data = [
	{ month: "Jan", value: 40 },
	{ month: "Feb", value: 55 },
	{ month: "Mar", value: 30 },
	{ month: "Apr", value: 70 },
	{ month: "May", value: 45 },
	{ month: "Jun", value: 80 },
	{ month: "Jul", value: 60 },
];

const config = {
	value: { label: "Value" },
} satisfies ChartConfig;

const meta = {
	title: "Components/SparkChart",
	component: SparkAreaChart,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {},
	args: {},
} satisfies Meta<typeof SparkAreaChart>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Area: Story = {
	render() {
		return <SparkAreaChart config={config} data={data} dataKey="month" />;
	},
};

export const Line: Story = {
	render() {
		return <SparkLineChart config={config} data={data} dataKey="month" />;
	},
};

export const Bar: Story = {
	render() {
		return <SparkBarChart config={config} data={data} dataKey="month" />;
	},
};
