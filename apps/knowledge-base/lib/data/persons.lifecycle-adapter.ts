import * as schema from "@dariah-eric/database/schema";

import type { EntityLifecycleAdapter } from "@/lib/data/entity-lifecycle";
import { eq } from "@/lib/db/sql";

export const personsLifecycleAdapter: EntityLifecycleAdapter = {
	async cloneSubtype(tx, sourceVersionId, targetVersionId) {
		const [source] = await tx
			.select({
				email: schema.persons.email,
				imageId: schema.persons.imageId,
				name: schema.persons.name,
				orcid: schema.persons.orcid,
				sortName: schema.persons.sortName,
			})
			.from(schema.persons)
			.where(eq(schema.persons.id, sourceVersionId))
			.limit(1);
		if (source == null) {
			return;
		}
		await tx.insert(schema.persons).values({ id: targetVersionId, ...source });

		const memberships = await tx
			.select({
				organisationalUnitId: schema.personsToOrganisationalUnits.organisationalUnitId,
				roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.personId, sourceVersionId));

		if (memberships.length > 0) {
			await tx.insert(schema.personsToOrganisationalUnits).values(
				memberships.map((m) => {
					return { personId: targetVersionId, ...m };
				}),
			);
		}
	},

	async wipeSubtype(tx, versionId) {
		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.personId, versionId));
		await tx.delete(schema.persons).where(eq(schema.persons.id, versionId));
	},
};
