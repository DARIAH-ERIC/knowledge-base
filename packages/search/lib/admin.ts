import { Result } from "better-result";
import { Client, type CollectionCreateSchema, type CollectionSchema, Errors } from "typesense";

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

/**
 * The most documents per source that a rebuild is measured against. Stored on each collection, so
 * it survives swaps and resets, and only an explicit override can lower it.
 */
export type DocumentBaseline = Record<string, number>;

interface VersionedCollection {
	name: string;
	version: number;
}

interface CollectionMetadata {
	document_baseline: DocumentBaseline;
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

	/**
	 * For the calls a swap cannot afford to lose: dropping a large collection can outlast the default
	 * timeout, and once a pre-alias collection is gone, searches fail until the alias is in place.
	 */
	const patientClient = new Client({
		apiKey,
		nodes,
		connectionTimeoutSeconds: 60,
		numRetries: 5,
		retryIntervalSeconds: 1,
	});

	/**
	 * Also true for an alias, since typesense resolves aliases when retrieving a collection. Throws
	 * when typesense cannot answer: treating that as "does not exist" would swap an empty collection
	 * over live data.
	 */
	function collectionExists(name: string): Promise<boolean> {
		return client.collections(name).exists();
	}

	async function deleteLegacyCollection(name: string): Promise<void> {
		try {
			await patientClient.collections(name).delete();
		} catch (error) {
			/** A retry after a timed out delete finds the collection already gone. */
			if (!(error instanceof Errors.ObjectNotFound)) {
				throw error;
			}
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
		metadata?: CollectionMetadata,
	): Promise<VersionedCollection> {
		const version = Date.now();
		const name = `${alias}_${String(version)}`;

		await client.collections().create({ ...schema(name), metadata });

		return { name, version };
	}

	async function dropStaleVersions(
		alias: string,
		collection: VersionedCollection,
		previous: string | null,
	): Promise<void> {
		const previousVersion = previous != null ? getCollectionVersion(alias, previous) : null;

		if (previousVersion == null) {
			return;
		}

		const olderVersions = (await client.collections().retrieve())
			.map((item) => {
				return { ...item, version: getCollectionVersion(alias, item.name) };
			})
			/**
			 * Anything newer than the previous target has never been live, so it may belong to a rebuild
			 * that is still running. If it was abandoned instead, the next swap drops it.
			 */
			.filter((item) => item.version != null && item.version <= previousVersion)
			.toSorted((a, b) => b.version! - a.version!);

		/** After a reset the previous version is empty, which makes it useless for a rollback. */
		const lastWithDocuments = olderVersions.find((item) => item.num_documents > 0);

		const stale = olderVersions.filter(
			(item) => item.name !== previous && item.name !== lastWithDocuments?.name,
		);

		await Promise.allSettled(stale.map((item) => client.collections(item.name).delete()));
	}

	/**
	 * Points the alias at the collection, then drops the versions older than it — except the one the
	 * alias pointed at before and the newest one with documents, which are kept so a bad rebuild can
	 * be rolled back by pointing the alias back at them.
	 */
	async function swapAlias(alias: string, collection: VersionedCollection): Promise<void> {
		const previous = await getAliasTarget(alias);
		const previousVersion = previous != null ? getCollectionVersion(alias, previous) : null;

		if (previousVersion != null && previousVersion > collection.version) {
			/** Nothing points at this collection, and swapping it in would move the alias backwards. */
			await client
				.collections(collection.name)
				.delete()
				.catch(() => undefined);

			throw new Error(`A newer rebuild of "${alias}" finished first: ${String(previous)}.`);
		}

		if (previous == null && (await collectionExists(alias))) {
			/**
			 * A collection created before collections were aliased. An alias cannot share its name with a
			 * collection, so it has to go before the alias can take its place.
			 */
			await deleteLegacyCollection(alias);
		}

		await patientClient.aliases().upsert(alias, { collection_name: collection.name });

		/**
		 * Stale versions only take up space, and the next swap retries them, so failing to drop them
		 * does not fail the swap: by now the alias already points at the new collection.
		 */
		await dropStaleVersions(alias, collection, previous).catch(() => undefined);
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

	async function retrieveCollection(name: string): Promise<CollectionSchema | null> {
		try {
			return await client.collections(name).retrieve();
		} catch (error) {
			if (error instanceof Errors.ObjectNotFound) {
				return null;
			}

			throw error;
		}
	}

	/** The live collection, or after a reset emptied it, the newest older one with documents. */
	async function getLastCollectionWithDocuments(alias: string): Promise<CollectionSchema | null> {
		const live = await retrieveCollection(alias);

		if (live == null || live.num_documents > 0) {
			return live;
		}

		const liveVersion = getCollectionVersion(alias, live.name);

		if (liveVersion == null) {
			return null;
		}

		const older = (await client.collections().retrieve())
			.map((item) => {
				return { item, version: getCollectionVersion(alias, item.name) };
			})
			.filter(
				({ item, version }) => version != null && version < liveVersion && item.num_documents > 0,
			)
			.toSorted((a, b) => b.version! - a.version!);

		return older[0]?.item ?? null;
	}

	async function countDocumentsBySource(collectionName: string): Promise<DocumentBaseline> {
		const { facet_counts } = await client
			.collections<ResourceDocument>(collectionName)
			.documents()
			.search({ facet_by: "source", max_facet_values: 100, per_page: 0, q: "*" });

		const counts = facet_counts?.find((facet) => facet.field_name === "source")?.counts ?? [];

		return Object.fromEntries(counts.map(({ count, value }) => [value, count]));
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

				/**
				 * Read from the last collection with documents, so a reset does not lower it. Collections
				 * without a stored baseline are measured by what they hold.
				 */
				getBaseline(): Promise<Result<DocumentBaseline, SearchCollectionError>> {
					return Result.tryPromise({
						async try() {
							const collection = await getLastCollectionWithDocuments(collections.resources);

							if (collection == null) {
								return {};
							}

							const metadata = collection.metadata as Partial<CollectionMetadata> | undefined;

							return metadata?.document_baseline ?? (await countDocumentsBySource(collection.name));
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
					baseline: DocumentBaseline,
				): Promise<Result<void, SearchCollectionError | SearchImportError>> {
					return Result.gen(async function* () {
						const collection = yield* await Result.tryPromise({
							try() {
								return createVersionedCollection(
									collections.resources,
									resourcesCollection.schema,
									{
										document_baseline: baseline,
									},
								);
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

				/** For seeding only: the next rebuild drops whatever is written through the alias. */
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

				/** For seeding only: the next rebuild drops whatever is written through the alias. */
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
