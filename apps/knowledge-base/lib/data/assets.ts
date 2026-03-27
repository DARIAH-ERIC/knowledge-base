/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { db } from "@dariah-eric/database/client";
import * as schema from "@dariah-eric/database/schema";

import { images, type ImageUrlOptions } from "@/lib/images";
import { type AssetPrefix, assetPrefixes, storage as s3 } from "@/lib/storage";

export { assetPrefixes };

interface GetAssetsParams {
	imageUrlOptions: ImageUrlOptions;
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getAssets(params: GetAssetsParams) {
	const { imageUrlOptions, limit = 10, offset = 0 } = params;

	const [assets, total] = await Promise.all([
		db.query.assets.findMany({
			columns: {
				key: true,
			},
			limit,
			offset,
			orderBy: {
				updatedAt: "desc",
			},
		}),
		db.$count(schema.assets),
	]);

	const urls = assets.map((asset) => {
		const { url } = images.generateSignedImageUrl({
			key: asset.key,
			options: imageUrlOptions,
		});

		return url;
	});

	return {
		urls,
		total,
	};
}

interface GetMediaLibraryAssetsParams {
	imageUrlOptions: ImageUrlOptions;
	/** @default 50 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

export async function getMediaLibraryAssets(params: GetMediaLibraryAssetsParams) {
	const { imageUrlOptions, limit = 50, offset = 0 } = params;

	const [assets, total] = await Promise.all([
		db.query.assets.findMany({
			columns: {
				key: true,
				label: true,
			},
			limit,
			offset,
			orderBy: {
				updatedAt: "desc",
			},
		}),
		db.$count(schema.assets),
	]);

	const items = assets.map((asset) => {
		const { url } = images.generateSignedImageUrl({
			key: asset.key,
			options: imageUrlOptions,
		});

		return { key: asset.key, label: asset.label, url };
	});

	return { items, total };
}

interface UploadAssetParams {
	file: File;
	licenseId?: schema.AssetInput["licenseId"];
	prefix: AssetPrefix;
	label?: string;
	caption?: string;
	alt?: string;
}

export async function uploadAsset(params: UploadAssetParams) {
	const { file, licenseId, prefix, label, alt, caption } = params;

	const input = Readable.fromWeb(file.stream() as ReadableStream);
	const size = file.size;
	const metadata = { "content-type": file.type, name: file.name };

	const { key } = await s3.images.upload({ input, prefix, metadata, size });

	const [inserted] = await db
		.insert(schema.assets)
		.values({
			key,
			licenseId,
			mimeType: metadata["content-type"],
			label: label ?? file.name,
			alt,
			caption,
		})
		.returning({ id: schema.assets.id });

	return {
		key,
		id: inserted!.id,
	};
}

interface GetAssetsForDashboardParams {
	imageUrlOptions: ImageUrlOptions;
	/** @default 500 */
	limit?: number;
}

export async function getAssetsForDashboard(params: GetAssetsForDashboardParams) {
	const { imageUrlOptions, limit = 500 } = params;

	const [assets, total] = await Promise.all([
		db.query.assets.findMany({
			columns: {
				id: true,
				key: true,
				label: true,
			},
			limit,
			orderBy: {
				updatedAt: "desc",
			},
		}),
		db.$count(schema.assets),
	]);

	const items = assets.map((asset) => {
		const { url } = images.generateSignedImageUrl({
			key: asset.key,
			options: imageUrlOptions,
		});

		return { id: asset.id, key: asset.key, label: asset.label, url };
	});

	return { items, total };
}

interface GetPresignedUploadUrlParams {
	prefix: AssetPrefix;
}

export async function getPresignedUploadUrl(params: GetPresignedUploadUrlParams) {
	const { prefix } = params;

	const { key, url } = await s3.urls.generatePresignedUploadUrl({ prefix });

	return {
		key,
		url,
	};
}
