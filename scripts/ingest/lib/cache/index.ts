import { mkdirSync } from "node:fs";
import * as path from "node:path";

import { log } from "@acdh-oeaw/lib";
import { Result, TaggedError } from "better-result";

export class CacheFileError extends TaggedError("CacheFileError")<{
	readonly cause?: unknown;
	readonly message?: string;
}>() {}

export interface CreateCacheServiceParams {
	cacheDir: string;
}

// oxlint-disable-next-line typescript/explicit-module-boundary-types
export function createCacheService(params: CreateCacheServiceParams) {
	const { cacheDir } = params;

	return {
		async getOrFetch<T, E>(key: string, fetcher: () => Promise<Result<T, E>>): Promise<Result<T, CacheFileError | E>> {
			const file = Bun.file(path.join(cacheDir, `${key}.json`));

			if (await file.exists()) {
				log.info(`Cache hit for "${key}".`);

				return Result.tryPromise({
					// oxlint-disable-next-line typescript/no-unsafe-type-assertion
					try: () => file.json() as Promise<T>,
					catch: (cause) => new CacheFileError({ cause }),
				});
			}

			log.info(`Cache miss for "${key}", fetching from API...`);

			const result = await fetcher();

			if (result.isOk()) {
				mkdirSync(path.dirname(file.name!), { recursive: true });
				await Bun.write(file, JSON.stringify(result.value, null, 2));
			}

			return result;
		},
	};
}

export type CacheService = ReturnType<typeof createCacheService>;
