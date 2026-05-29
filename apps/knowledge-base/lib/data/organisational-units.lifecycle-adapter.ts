import * as schema from "@dariah-eric/database/schema";

import type { EntityLifecycleAdapter } from "@/lib/data/entity-lifecycle";
import { eq, or } from "@/lib/db/sql";

export const organisationalUnitsLifecycleAdapter: EntityLifecycleAdapter = {
	async cloneSubtype(tx, sourceVersionId, targetVersionId) {
		const [source] = await tx
			.select({
				acronym: schema.organisationalUnits.acronym,
				ror: schema.organisationalUnits.ror,
				imageId: schema.organisationalUnits.imageId,
				metadata: schema.organisationalUnits.metadata,
				name: schema.organisationalUnits.name,
				sshocMarketplaceActorId: schema.organisationalUnits.sshocMarketplaceActorId,
				summary: schema.organisationalUnits.summary,
				typeId: schema.organisationalUnits.typeId,
			})
			.from(schema.organisationalUnits)
			.where(eq(schema.organisationalUnits.id, sourceVersionId))
			.limit(1);
		if (source == null) {
			return;
		}
		await tx.insert(schema.organisationalUnits).values({ id: targetVersionId, ...source });

		const relations = await tx
			.select({
				relatedUnitId: schema.organisationalUnitsRelations.relatedUnitId,
				duration: schema.organisationalUnitsRelations.duration,
				status: schema.organisationalUnitsRelations.status,
			})
			.from(schema.organisationalUnitsRelations)
			.where(eq(schema.organisationalUnitsRelations.unitId, sourceVersionId));

		if (relations.length > 0) {
			await tx.insert(schema.organisationalUnitsRelations).values(
				relations.map((r) => {
					return { unitId: targetVersionId, ...r };
				}),
			);
		}

		const personRelations = await tx
			.select({
				personId: schema.personsToOrganisationalUnits.personId,
				roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.organisationalUnitId, sourceVersionId));

		if (personRelations.length > 0) {
			await tx.insert(schema.personsToOrganisationalUnits).values(
				personRelations.map((r) => {
					return { organisationalUnitId: targetVersionId, ...r };
				}),
			);
		}

		const socialMedia = await tx
			.select({ socialMediaId: schema.organisationalUnitsToSocialMedia.socialMediaId })
			.from(schema.organisationalUnitsToSocialMedia)
			.where(eq(schema.organisationalUnitsToSocialMedia.organisationalUnitId, sourceVersionId));

		if (socialMedia.length > 0) {
			await tx.insert(schema.organisationalUnitsToSocialMedia).values(
				socialMedia.map((s) => {
					return { organisationalUnitId: targetVersionId, ...s };
				}),
			);
		}
	},

	async replaceSubtype(tx, sourceVersionId, targetVersionId) {
		const [source] = await tx
			.select({
				acronym: schema.organisationalUnits.acronym,
				ror: schema.organisationalUnits.ror,
				imageId: schema.organisationalUnits.imageId,
				metadata: schema.organisationalUnits.metadata,
				name: schema.organisationalUnits.name,
				sshocMarketplaceActorId: schema.organisationalUnits.sshocMarketplaceActorId,
				summary: schema.organisationalUnits.summary,
				typeId: schema.organisationalUnits.typeId,
			})
			.from(schema.organisationalUnits)
			.where(eq(schema.organisationalUnits.id, sourceVersionId))
			.limit(1);
		if (source == null) {
			return;
		}

		await tx
			.update(schema.organisationalUnits)
			.set(source)
			.where(eq(schema.organisationalUnits.id, targetVersionId));

		await tx
			.delete(schema.organisationalUnitsToSocialMedia)
			.where(eq(schema.organisationalUnitsToSocialMedia.organisationalUnitId, targetVersionId));
		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.organisationalUnitId, targetVersionId));
		await tx
			.delete(schema.organisationalUnitsRelations)
			.where(eq(schema.organisationalUnitsRelations.unitId, targetVersionId));

		const relations = await tx
			.select({
				relatedUnitId: schema.organisationalUnitsRelations.relatedUnitId,
				duration: schema.organisationalUnitsRelations.duration,
				status: schema.organisationalUnitsRelations.status,
			})
			.from(schema.organisationalUnitsRelations)
			.where(eq(schema.organisationalUnitsRelations.unitId, sourceVersionId));

		if (relations.length > 0) {
			await tx.insert(schema.organisationalUnitsRelations).values(
				relations.map((r) => {
					return { unitId: targetVersionId, ...r };
				}),
			);
		}

		const personRelations = await tx
			.select({
				personId: schema.personsToOrganisationalUnits.personId,
				roleTypeId: schema.personsToOrganisationalUnits.roleTypeId,
				duration: schema.personsToOrganisationalUnits.duration,
			})
			.from(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.organisationalUnitId, sourceVersionId));

		if (personRelations.length > 0) {
			await tx.insert(schema.personsToOrganisationalUnits).values(
				personRelations.map((r) => {
					return { organisationalUnitId: targetVersionId, ...r };
				}),
			);
		}

		const socialMedia = await tx
			.select({ socialMediaId: schema.organisationalUnitsToSocialMedia.socialMediaId })
			.from(schema.organisationalUnitsToSocialMedia)
			.where(eq(schema.organisationalUnitsToSocialMedia.organisationalUnitId, sourceVersionId));

		if (socialMedia.length > 0) {
			await tx.insert(schema.organisationalUnitsToSocialMedia).values(
				socialMedia.map((s) => {
					return { organisationalUnitId: targetVersionId, ...s };
				}),
			);
		}
	},

	async wipeSubtype(tx, versionId) {
		await tx
			.delete(schema.organisationalUnitsToSocialMedia)
			.where(eq(schema.organisationalUnitsToSocialMedia.organisationalUnitId, versionId));
		await tx
			.delete(schema.personsToOrganisationalUnits)
			.where(eq(schema.personsToOrganisationalUnits.organisationalUnitId, versionId));
		await tx
			.delete(schema.organisationalUnitsRelations)
			.where(
				or(
					eq(schema.organisationalUnitsRelations.unitId, versionId),
					eq(schema.organisationalUnitsRelations.relatedUnitId, versionId),
				),
			);
		await tx.delete(schema.organisationalUnits).where(eq(schema.organisationalUnits.id, versionId));
	},
};
