/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { forbidden } from "next/navigation";

import {
	getEntityRelationOptionsByIds,
	getEntityRelations,
	getResourceRelationOptionsByIds,
} from "@/lib/data/relations";
import { getUnitRelations, getUnitRelationStatusOptions } from "@/lib/data/unit-relations";
import { getWorkingGroupChairs } from "@/lib/data/working-group-chairs";
import { db } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";

type ManagedOrganisationalUnitType =
	| "country"
	| "governance_body"
	| "institution"
	| "national_consortium"
	| "working_group";

function assertAdminUser(user: Pick<User, "role">): void {
	if (user.role !== "admin") {
		forbidden();
	}
}

async function getOrganisationalUnitBySlugForAdmin(
	currentUser: Pick<User, "role">,
	unitType: ManagedOrganisationalUnitType,
	slug: string,
) {
	assertAdminUser(currentUser);

	return db.query.organisationalUnits.findFirst({
		where: {
			type: { type: unitType },
			entity: { slug },
		},
		columns: {
			acronym: true,
			id: true,
			name: true,
			summary: true,
		},
		with: {
			entity: {
				columns: {
					documentId: true,
					slug: true,
				},
			},
			image: {
				columns: {
					key: true,
					label: true,
				},
			},
		},
	});
}

export async function getOrganisationalUnitEditDataForAdmin(
	currentUser: Pick<User, "role">,
	params: { slug: string; unitType: ManagedOrganisationalUnitType },
) {
	const { slug, unitType } = params;

	const unit = await getOrganisationalUnitBySlugForAdmin(currentUser, unitType, slug);

	if (unit == null) {
		return null;
	}

	const [descriptionRows, relationIds, relations, unitRelationStatusOptions] = await Promise.all([
		db
			.select({ content: schema.richTextContentBlocks.content })
			.from(schema.richTextContentBlocks)
			.innerJoin(schema.contentBlocks, eq(schema.richTextContentBlocks.id, schema.contentBlocks.id))
			.innerJoin(schema.fields, eq(schema.contentBlocks.fieldId, schema.fields.id))
			.innerJoin(
				schema.entityTypesFieldsNames,
				eq(schema.fields.fieldNameId, schema.entityTypesFieldsNames.id),
			)
			.where(
				and(
					eq(schema.fields.entityId, unit.id),
					eq(schema.entityTypesFieldsNames.fieldName, "description"),
				),
			)
			.limit(1),
		getEntityRelations(unit.id),
		getUnitRelations(unit.id),
		getUnitRelationStatusOptions(unitType),
	]);

	const { relatedEntityIds, relatedResourceIds } = relationIds;
	const [selectedRelatedEntities, selectedRelatedResources] = await Promise.all([
		getEntityRelationOptionsByIds(relatedEntityIds),
		getResourceRelationOptionsByIds(relatedResourceIds),
	]);

	return {
		relations,
		relatedEntityIds,
		relatedResourceIds,
		selectedRelatedEntities,
		selectedRelatedResources,
		unit: {
			...unit,
			description: descriptionRows.at(0)?.content,
		},
		unitRelationStatusOptions,
	};
}

export async function getWorkingGroupEditDataForAdmin(
	currentUser: Pick<User, "role">,
	slug: string,
) {
	const data = await getOrganisationalUnitEditDataForAdmin(currentUser, {
		slug,
		unitType: "working_group",
	});

	if (data == null) {
		return null;
	}

	const chairs = await getWorkingGroupChairs(data.unit.id);

	return { ...data, chairs };
}
