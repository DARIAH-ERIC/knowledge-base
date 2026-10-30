import { Result } from "better-result";
import { Client, type CollectionCreateSchema, Errors } from "typesense";

import { type ResourceDocument, resourcesCollection } from "./collections/resources";
import { type WebsiteDocument, websiteCollection } from "./collections/website";
import {
	SearchApiKeyError,
	SearchCollectionError,
	SearchDocumentDeleteError,
	SearchDocumentUpsertError,
	SearchImportError,
} from "./errors";

export type { ResourceDocument } from "./collections/resources";
export type { WebsiteDocument } from "./collections/website";

export interface CreateSearchAdminServiceParams {
	apiKey: string;
	nodes: Array<{ host: string; port: number; protocol: "http" | "https" }>;
	/**
	 * Collection aliases. Each alias points at a versioned collection (`<alias>_<timestamp>`), so a
	 * collection can be rebuilt in the background and swapped in at once, without searches ever
	 * seeing it empty or half-built.
	 */
	collections: {
		resources: string;
		website: string;
	};
}

interface VersionedCollection {
	name: string;
	version: number;
}

function getCollectionVersion(alias: string, collectionName: string): number | null {
	const prefix = `${alias}_`;

	if (!collectionName.startsWith(prefix)) {
		return null;
	}

	const version = collectionName.slice(prefix.length);

	return /^\d+$/.test(version) ? Number(version) : null;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createSearchAdminService(params: CreateSearchAdminServiceParams) {
	const { apiKey, collections, nodes } = params;

	const client = new Client({
		apiKey,
		nodes,
		connectionTimeoutSeconds: 5,
	});

	/** Also true for an alias, since typesense resolves aliases when retrieving a collection. */
	async function collectionExists(name: string): Promise<boolean> {
		try {
			await client.collections(name).retrieve();
			return true;
		} catch {
			return false;
		}
	}

	async function getAliasTarget(alias: string): Promise<string | null> {
		try {
			const { collection_name } = await client.aliases(alias).retrieve();
			return collection_name;
		} catch (error) {
			if (error instanceof Errors.ObjectNotFound) {
				return null;
			}

			throw error;
		}
	}

	async function createVersionedCollection(
		alias: string,
		schema: (name: string) => CollectionCreateSchema,
	): Promise<VersionedCollection> {
		const version = Date.now();
		const name = `${alias}_${String(version)}`;

		await client.collections().create(schema(name));

		return { name, version };
	}

	/**
	 * Points the alias at the collection, then drops the versions older than it — except the one the
	 * alias pointed at before, which is kept so a bad rebuild can be rolled back by pointing the
	 * alias back at it.
	 */
	async function swapAlias(alias: string, collection: VersionedCollection): Promise<void> {
		const previous = await getAliasTarget(alias);

		if (previous == null && (await collectionExists(alias))) {
			/**
			 * A collection created before collections were aliased. An alias cannot share its name with a
			 * collection, so it has to go before the alias can take its place.
			 */
			await client.collections(alias).delete();
		}

		await client.aliases().upsert(alias, { collection_name: collection.name });

		const stale = (await client.collections().retrieve()).filter((item) => {
			if (item.name === previous) {
				return false;
			}

			const version = getCollectionVersion(alias, item.name);

			/** Newer versions are left alone: they may belong to a rebuild that is still running. */
			return version != null && version < collection.version;
		});

		/**
		 * Stale versions only take up space, and the next swap retries them, so failing to drop one
		 * does not fail the swap.
		 */
		await Promise.allSettled(stale.map((item) => client.collections(item.name).delete()));
	}

	async function createAliasedCollection(
		alias: string,
		schema: (name: string) => CollectionCreateSchema,
	): Promise<void> {
		if (await collectionExists(alias)) {
			return;
		}

		await swapAlias(alias, await createVersionedCollection(alias, schema));
	}

	async function resetAliasedCollection(
		alias: string,
		schema: (name: string) => CollectionCreateSchema,
	): Promise<void> {
		await swapAlias(alias, await createVersionedCollection(alias, schema));
	}

	async function countDocuments(alias: string): Promise<number> {
		try {
			const collection = await client.collections(alias).retrieve();
			return collection.num_documents;
		} catch (error) {
			if (error instanceof Errors.ObjectNotFound) {
				return 0;
			}

			throw error;
		}
	}

	return {
		apiKeys: {
			create(): Promise<Result<string, SearchApiKeyError>> {
				return Result.tryPromise({
					async try() {
						const key = await client.keys().create({
							description: "Search API key",
							actions: ["documents:export", "documents:get", "documents:search"],
							/** Scoped to the aliases, so the key keeps working across collection swaps. */
							collections: [collections.resources, collections.website],
						});

						return key.value!;
					},
					catch(cause) {
						return new SearchApiKeyError({ cause });
					},
				});
			},
		},

		collections: {
			resources: {
				create(): Promise<Result<void, SearchCollectionError>> {
					return Result.tryPromise({
						async try() {
							await createAliasedCollection(collections.resources, resourcesCollection.schema);
						},
						catch(cause) {
							return new SearchCollectionError({ cause });
						},
					});
				},

				reset(): Promise<Result<void, SearchCollectionError>> {
					return Result.tryPromise({
						async try() {
							await resetAliasedCollection(collections.resources, resourcesCollection.schema);
						},
						catch(cause) {
							return new SearchCollectionError({ cause });
						},
					});
				},

				count(): Promise<Result<number, SearchCollectionError>> {
					return Result.tryPromise({
						try() {
							return countDocuments(collections.resources);
						},
						catch(cause) {
							return new SearchCollectionError({ cause });
						},
					});
				},

				/**
				 * Builds a new collection with the current schema from `documents` and swaps it in, so it
				 * also applies schema changes. Only safe because nothing else writes to this collection: a
				 * write through the alias while the new collection is being built would be lost at the
				 * swap.
				 */
				replace(
					documents: Array<ResourceDocument>,
				): Promise<Result<void, SearchCollectionError | SearchImportError>> {
					return Result.gen(async function* () {
						const collection = yield* await Result.tryPromise({
							try() {
								return createVersionedCollection(collections.resources, resourcesCollection.schema);
							},
							catch(cause) {
								return new SearchCollectionError({ cause });
							},
						});

						const importResult = await Result.tryPromise({
							async try() {
								/** Typesense rejects an import without documents. */
								if (documents.length === 0) {
									return;
								}

								await client
									.collections<ResourceDocument>(collection.name)
									.documents()
									.import(documents, { action: "upsert" });
							},
							catch(cause) {
								return new SearchImportError({ cause });
							},
						});

						if (importResult.isErr()) {
							/** Nothing points at the half-built collection, so drop it right away. */
							await client
								.collections(collection.name)
								.delete()
								.catch(() => undefined);
						}

						yield* importResult;

						yield* await Result.tryPromise({
							try() {
								return swapAlias(collections.resources, collection);
							},
							catch(cause) {
								return new SearchCollectionError({ cause });
							},
						});

						return Result.ok(undefined);
					});
				},

				ingest(documents: Array<ResourceDocument>): Promise<Result<void, SearchImportError>> {
					return Result.tryPromise({
						async try() {
							await client
								.collections<ResourceDocument>(collections.resources)
								.documents()
								.import(documents, { action: "upsert" });
						},
						catch(cause) {
							return new SearchImportError({ cause });
						},
					});
				},

				upsert(document: ResourceDocument): Promise<Result<void, SearchDocumentUpsertError>> {
					return Result.tryPromise({
						async try() {
							await client
								.collections<ResourceDocument>(collections.resources)
								.documents()
								.upsert(document);
						},
						catch(cause) {
							return new SearchDocumentUpsertError({ cause });
						},
					});
				},

				delete(documentId: string): Promise<Result<void, SearchDocumentDeleteError>> {
					return Result.tryPromise({
						async try() {
							await client
								.collections<ResourceDocument>(collections.resources)
								.documents(documentId)
								.delete();
						},
						catch(cause) {
							return new SearchDocumentDeleteError({ cause });
						},
					});
				},
			},

			website: {
				create(): Promise<Result<void, SearchCollectionError>> {
					return Result.tryPromise({
						async try() {
							await createAliasedCollection(collections.website, websiteCollection.schema);
						},
						catch(cause) {
							return new SearchCollectionError({ cause });
						},
					});
				},

				reset(): Promise<Result<void, SearchCollectionError>> {
					return Result.tryPromise({
						async try() {
							await resetAliasedCollection(collections.website, websiteCollection.schema);
						},
						catch(cause) {
							return new SearchCollectionError({ cause });
						},
					});
				},

				ingest(documents: Array<WebsiteDocument>): Promise<Result<void, SearchImportError>> {
					return Result.tryPromise({
						async try() {
							await client
								.collections<WebsiteDocument>(collections.website)
								.documents()
								.import(documents, { action: "upsert" });
						},
						catch(cause) {
							return new SearchImportError({ cause });
						},
					});
				},

				upsert(document: WebsiteDocument): Promise<Result<void, SearchDocumentUpsertError>> {
					return Result.tryPromise({
						async try() {
							await client
								.collections<WebsiteDocument>(collections.website)
								.documents()
								.upsert(document);
						},
						catch(cause) {
							return new SearchDocumentUpsertError({ cause });
						},
					});
				},

				delete(documentId: string): Promise<Result<void, SearchDocumentDeleteError>> {
					return Result.tryPromise({
						async try() {
							await client
								.collections<WebsiteDocument>(collections.website)
								.documents(documentId)
								.delete();
						},
						catch(cause) {
							return new SearchDocumentDeleteError({ cause });
						},
					});
				},
			},
		},
	};
}

export type SearchAdminService = ReturnType<typeof createSearchAdminService>;
