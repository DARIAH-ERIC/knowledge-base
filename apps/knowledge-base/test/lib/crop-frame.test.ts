import { getCropFrame } from "@dariah-eric/images/crop";
import { describe, expect, it } from "vitest";

describe("getCropFrame", () => {
	it("keeps the full height of an image cropped narrower, centred without a focal point", () => {
		expect(getCropFrame({ imageAspectRatio: 2, cropAspectRatio: 1 })).toStrictEqual({
			x: 0.25,
			y: 0,
			width: 0.5,
			height: 1,
		});
	});

	it("keeps the full width of an image cropped wider", () => {
		const frame = getCropFrame({ imageAspectRatio: 1, cropAspectRatio: 2 });

		expect(frame).toStrictEqual({ x: 0, y: 0.25, width: 1, height: 0.5 });
	});

	it("centres the frame on the focal point, as imgproxy's `fp` gravity does", () => {
		/* `object-position: 29%` would start this frame at 0.145; imgproxy centres it on the point. */
		const frame = getCropFrame({
			imageAspectRatio: 2,
			cropAspectRatio: 1,
			focalPoint: { x: 0.29, y: 0.5 },
		});

		expect(frame.x).toBeCloseTo(0.04);
		expect(frame.width).toBe(0.5);
	});

	it("keeps the frame inside the image when the point is near an edge", () => {
		expect(
			getCropFrame({ imageAspectRatio: 2, cropAspectRatio: 1, focalPoint: { x: 0.05, y: 0.5 } }).x,
		).toBe(0);
		expect(
			getCropFrame({ imageAspectRatio: 2, cropAspectRatio: 1, focalPoint: { x: 0.95, y: 0.5 } }).x,
		).toBe(0.5);
		expect(
			getCropFrame({ imageAspectRatio: 1, cropAspectRatio: 2, focalPoint: { x: 0.5, y: 1 } }).y,
		).toBe(0.5);
	});

	it("keeps the whole image when the crop has its shape", () => {
		expect(
			getCropFrame({
				imageAspectRatio: 16 / 9,
				cropAspectRatio: 16 / 9,
				focalPoint: { x: 0.1, y: 0.9 },
			}),
		).toStrictEqual({ x: 0, y: 0, width: 1, height: 1 });
	});
});
