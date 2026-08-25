import { randomUUID } from "node:crypto";

import { assert, log } from "@acdh-oeaw/lib";
import type { Database } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import slugify from "@sindresorhus/slugify";

function normalizePersonName(name: string): string {
	return name.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

function createSortName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);

	if (parts.length <= 1) {
		return name;
	}

	const lastName = parts.at(-1)!;
	const firstNames = parts.slice(0, -1).join(" ");

	return `${lastName}, ${firstNames}`;
}

interface PersonResolver {
	/** Resolves an author name to a person entity version id, creating the person when unknown. */
	ensurePersonByName: (authorName: string) => Promise<string>;
}

interface PersonResolverOptions {
	personEntityTypeId: string;
	publishedStatusId: string;
	placeholderImageId: string;
}

/**
 * Resolves the author names scraped off WordPress articles to person entity versions, creating a
 * person for a name the knowledge base does not know yet.
 *
 * Matching is by name, case- and whitespace-insensitive, with a substring fallback so a byline that
 * carries more than the name ("Jane Doe PhD") still finds the person it names. Created persons only
 * have a name — an editor fills in the rest — so the resolver is shared by the bulk import and the
 * single-article imports to keep one person per author rather than one per import run.
 */
export async function createPersonResolver(
	db: Database,
	options: PersonResolverOptions,
): Promise<PersonResolver> {
	const personsByName = new Map<string, string>();

	const existingPersons = await db.query.persons.findMany({
		columns: {
			id: true,
			name: true,
		},
	});

	for (const person of existingPersons) {
		personsByName.set(normalizePersonName(person.name), person.id);
	}

	async function ensurePersonByName(authorName: string): Promise<string> {
		const normalizedAuthorName = normalizePersonName(authorName);

		const exact = personsByName.get(normalizedAuthorName);
		if (exact != null) {
			return exact;
		}

		for (const [name, dbId] of personsByName) {
			if (normalizedAuthorName.includes(name)) {
				return dbId;
			}
		}

		const createdAt = new Date();

		const personId = await db.transaction(async (tx) => {
			let slug = slugify(authorName);
			const slugExists = await tx.query.entities.findFirst({
				where: {
					typeId: options.personEntityTypeId,
					slug,
				},
				columns: {
					id: true,
				},
			});

			if (slugExists != null) {
				slug = `${slug}-duplicate-${randomUUID()}`;
			}

			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug,
					typeId: options.personEntityTypeId,
					createdAt,
					updatedAt: createdAt,
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const [version] = await tx
				.insert(schema.entityVersions)
				.values({
					entityId: entity.id,
					statusId: options.publishedStatusId,
				})
				.returning({ id: schema.entityVersions.id });

			assert(version);

			await tx.insert(schema.persons).values({
				id: version.id,
				name: authorName,
				sortName: createSortName(authorName),
				imageId: options.placeholderImageId,
				createdAt,
				updatedAt: createdAt,
			});

			return version.id;
		});

		personsByName.set(normalizedAuthorName, personId);
		log.info(`Created person "${authorName}" for author relation import.`);

		return personId;
	}

	return { ensurePersonByName };
}
