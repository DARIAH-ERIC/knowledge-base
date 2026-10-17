import type { Meta, StoryObj } from "@storybook/react-vite";

import { Carousel } from "./carousel";

const meta = {
	title: "Components/Carousel",
	component: Carousel,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	args: {
		label: "Example slides",
		slides: [],
	},
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

const slides = [
	{ id: 1, label: "Slide 1", bg: "bg-primary-subtle" },
	{ id: 2, label: "Slide 2", bg: "bg-success-subtle" },
	{ id: 3, label: "Slide 3", bg: "bg-warning-subtle" },
	{ id: 4, label: "Slide 4", bg: "bg-danger-subtle" },
];

export const Default: Story = {
	render() {
		return (
			<div className="inline-80">
				<Carousel
					label="Example slides"
					slides={slides.map((slide) => (
						<div
							key={slide.id}
							className={`flex items-center justify-center rounded-xl block-40 inline-64 ${slide.bg} text-sm font-medium`}
						>
							{slide.label}
						</div>
					))}
				/>
			</div>
		);
	},
};

/** Slides of different widths, as a gallery of images at their own aspect ratios gives. */
export const MixedWidths: Story = {
	render() {
		return (
			<div className="inline-96">
				<Carousel
					label="Example slides"
					slides={slides.map((slide, index) => (
						<div
							key={slide.id}
							className={`flex items-center justify-center rounded-xl block-32 ${index % 2 === 0 ? "inline-48" : "inline-28"} ${slide.bg} text-sm font-medium`}
						>
							{slide.label}
						</div>
					))}
				/>
			</div>
		);
	},
};

/** Slides that fit drop the button row. */
export const Fitting: Story = {
	render() {
		return (
			<div className="inline-96">
				<Carousel
					label="Example slides"
					slides={slides.slice(0, 2).map((slide) => (
						<div
							key={slide.id}
							className={`flex items-center justify-center rounded-xl block-32 inline-32 ${slide.bg} text-sm font-medium`}
						>
							{slide.label}
						</div>
					))}
				/>
			</div>
		);
	},
};
