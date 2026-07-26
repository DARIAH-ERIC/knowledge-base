import { Readable } from "node:stream";

import { assert } from "@acdh-oeaw/lib";
import { describeRoute } from "hono-openapi";

import { getContentDispositionHeader } from "@/lib/asset-download";
import { createRouter } from "@/lib/factory";
import { BAD_REQUEST, NOT_FOUND } from "@/lib/openapi/responses";
import { validator } from "@/lib/openapi/validator";
import { GetAssetDownload } from "@/routes/assets/schemas";
import { getAssetByKey } from "@/routes/assets/service";

/**
 * Serving an asset by its storage key, for the rich-text link targets that reference one (see
 * `link-targets.ts`). Images already have a public url through imgproxy; this is the equivalent for
 * everything else, and the only way a document linked from prose can be reached.
 *
 * Any asset is servable, matching the posture images already have: imgproxy renders any key, and
 * keys are unguessable uuidv7. Restricting to assets referenced from published content was
 * considered and rejected — it would make a link break the moment its page is unpublished, which is
 * surprising, and the reference scan is a substring search over `jsonb` (see
 * `asset-cleanup-service`), far too coarse to gate delivery on.
 */
export const router = createRouter()
	/** GET /api/assets/:prefix/:name/download */
	.get(
		"/:prefix/:name/download",
		describeRoute({
			tags: ["assets"],
			summary: "Download asset file",
			description: "Stream the S3-stored file for an asset, by storage key",
			operationId: "getAssetDownload",
			responses: {
				200: {
					description: "Binary file stream",
					content: {
						"application/pdf": {},
						"application/octet-stream": {},
					},
				},
				...BAD_REQUEST,
				...NOT_FOUND,
			},
		}),
		validator("param", GetAssetDownload.ParamsSchema),
		async (c) => {
			const { prefix, name } = c.req.valid("param");

			const db = c.get("db");
			assert(db, "Database must be provided via middleware.");

			const asset = await getAssetByKey(db, { key: `${prefix}/${name}` });

			if (asset == null) {
				return c.notFound();
			}

			const storage = c.get("storage");
			assert(storage, "Storage must be provided via middleware.");

			const nodeStream = (await storage.download(asset.key)).unwrap();
			const webStream = Readable.toWeb(nodeStream) as ReadableStream;

			return c.body(webStream, 200, {
				"Content-Disposition": getContentDispositionHeader(asset),
				"Content-Type": asset.mimeType,
			});
		},
	);
