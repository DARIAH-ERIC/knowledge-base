/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { Readable } from "node:stream";
import type { ReadableStream } from "node:stream/web";

import { isNonEmptyString } from "@acdh-oeaw/lib";
import * as schema from "@dariah-eric/database/schema";

import { db } from "@/lib/db";
import { unaccentIlike } from "@/lib/db/search";
import { and, count, desc, eq, like } from "@/lib/db/sql";
import { type ImageUrlOptions, images } from "@/lib/images";
import { type AssetPrefix, assetPrefixes, storage as s3 } from "@/lib/storage";

export { assetPrefixes };
export type { AssetPrefix };

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
	/** @default 20 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	prefix?: AssetPrefix;
	q?: string;
}

export async function getMediaLibraryAssets(params: GetMediaLibraryAssetsParams) {
	const { imageUrlOptions, limit = 20, offset = 0, prefix, q } = params;

	const prefixFilter = prefix != null ? like(schema.assets.key, `${prefix}/%`) : undefined;
	const searchFilter = isNonEmptyString(q)
		? unaccentIlike(schema.assets.label, `%${q}%`)
		: undefined;
	const where = and(prefixFilter, searchFilter);

	const [assets, aggregate] = await Promise.all([
		db
			.select({
				id: schema.assets.id,
				key: schema.assets.key,
				label: schema.assets.label,
				alt: schema.assets.alt,
				caption: schema.assets.caption,
				licenseId: schema.assets.licenseId,
				mimeType: schema.assets.mimeType,
				size: schema.assets.size,
			})
			.from(schema.assets)
			.where(where)
			.orderBy(desc(schema.assets.updatedAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.assets).where(where),
	]);

	const items = assets.map((asset) => {
		const { url } = images.generateSignedImageUrl({
			key: asset.key,
			options: imageUrlOptions,
		});

		return {
			id: asset.id,
			key: asset.key,
			label: asset.label,
			alt: asset.alt,
			caption: asset.caption,
			licenseId: asset.licenseId,
			mimeType: asset.mimeType,
			size: asset.size,
			url,
		};
	});

	return { items, total: aggregate.at(0)?.total ?? 0 };
}

interface UploadAssetParams {
	file: File;
	licenseId?: schema.AssetInput["licenseId"];
	prefix: AssetPrefix;
	label?: string;
	caption?: schema.AssetInput["caption"];
	alt?: string;
}

export async function uploadAsset(params: UploadAssetParams) {
	const { file, licenseId, prefix, label, alt, caption } = params;

	const input = Readable.fromWeb(file.stream() as ReadableStream);
	const size = file.size;
	const metadata = { "content-type": file.type, name: file.name };

	const { key } = (await s3.upload({ input, prefix, metadata, size })).unwrap();

	await db.insert(schema.assets).values({
		key,
		licenseId,
		mimeType: metadata["content-type"],
		filename: file.name,
		size,
		label: label ?? file.name,
		alt,
		caption,
	});

	return {
		key,
	};
}

interface UpdateAssetMetadataParams {
	id: string;
	label: string;
	alt?: string | null;
	caption?: schema.AssetInput["caption"];
	licenseId?: schema.AssetInput["licenseId"] | null;
}

export async function updateAssetMetadata(params: UpdateAssetMetadataParams) {
	const { id, label, alt, caption, licenseId } = params;

	await db
		.update(schema.assets)
		.set({
			label,
			alt,
			caption,
			licenseId,
		})
		.where(eq(schema.assets.id, id));
}

interface GetAssetsForDashboardParams {
	imageUrlOptions: ImageUrlOptions;
	/** @default 24 */
	limit?: number;
	/** @default 0 */
	offset?: number;
	prefix?: AssetPrefix;
	q?: string;
}

export async function getAssetsForDashboard(params: GetAssetsForDashboardParams) {
	const { imageUrlOptions, limit = 24, offset = 0, prefix, q } = params;

	const prefixFilter = prefix != null ? like(schema.assets.key, `${prefix}/%`) : undefined;
	const searchFilter = isNonEmptyString(q)
		? unaccentIlike(schema.assets.label, `%${q}%`)
		: undefined;
	const where = and(prefixFilter, searchFilter);

	const [assets, aggregate] = await Promise.all([
		db
			.select({
				id: schema.assets.id,
				key: schema.assets.key,
				label: schema.assets.label,
				alt: schema.assets.alt,
				caption: schema.assets.caption,
				licenseId: schema.assets.licenseId,
				mimeType: schema.assets.mimeType,
				size: schema.assets.size,
			})
			.from(schema.assets)
			.where(where)
			.orderBy(desc(schema.assets.updatedAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(schema.assets).where(where),
	]);

	const items = assets.map((asset) => {
		const { url } = images.generateSignedImageUrl({
			key: asset.key,
			options: imageUrlOptions,
		});

		return {
			id: asset.id,
			key: asset.key,
			label: asset.label,
			alt: asset.alt,
			caption: asset.caption,
			licenseId: asset.licenseId,
			mimeType: asset.mimeType,
			size: asset.size,
			url,
		};
	});

	return { items, total: aggregate.at(0)?.total ?? 0 };
}
