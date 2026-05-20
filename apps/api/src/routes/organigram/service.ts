import * as schema from "@dariah-eric/database/schema";

import type { Database, Transaction } from "@/middlewares/db";
import { and, eq, inArray, sql } from "@/services/db/sql";

// oxlint-disable-next-line typescript/explicit-module-boundary-types
export async function getOrganigram(db: Database | Transaction) {
	const nodes = await db.query.organigramNodes.findMany({
		columns: {
			id: true,
			slug: true,
			label: true,
			description: true,
			kind: true,
			position: true,
			entityId: true,
		},
		orderBy(t, { asc, sql }) {
			return [asc(sql`COALESCE(${t.position}, 2147483647)`), asc(t.slug)];
		},
	});

	const unitEntries = await Promise.all(
		nodes.map(async (node) => {
			if (node.entityId == null) {
				return [node.id, null] as const;
			}

			const unit = await db.query.organisationalUnits.findFirst({
				where: {
					entityVersion: {
						entity: { id: node.entityId },
						status: { type: "published" },
					},
				},
				columns: {
					id: true,
					name: true,
					acronym: true,
					summary: true,
					metadata: true,
				},
				with: {
					entityVersion: {
						columns: {},
						with: {
							entity: {
								columns: { slug: true },
							},
						},
					},
					type: {
						columns: { type: true },
					},
				},
			});

			if (unit == null) {
				return [node.id, null] as const;
			}

			return [
				node.id,
				{
					id: unit.id,
					slug: unit.entityVersion.entity.slug,
					name: unit.name,
					acronym: unit.acronym,
					summary: unit.summary,
					type: unit.type.type,
					metadata: unit.metadata,
				},
			] as const;
		}),
	);

	const unitsByNodeId = new Map(unitEntries);
	const nodeIdByUnitId = new Map<string, string>();

	for (const [nodeId, unit] of unitsByNodeId) {
		if (unit != null) {
			nodeIdByUnitId.set(unit.id, nodeId);
		}
	}

	const syntheticEdges = await db.query.organigramEdges.findMany({
		columns: {
			id: true,
			fromNodeId: true,
			toNodeId: true,
			relation: true,
			position: true,
		},
		orderBy(t, { asc, sql }) {
			return [asc(sql`COALESCE(${t.position}, 2147483647)`), asc(t.id)];
		},
	});

	const unitIds = [...nodeIdByUnitId.keys()];

	const relationRows =
		unitIds.length > 0
			? await db
					.select({
						unitId: schema.organisationalUnitsRelations.unitId,
						relatedUnitId: schema.organisationalUnitsRelations.relatedUnitId,
						relation: schema.organisationalUnitStatus.status,
					})
					.from(schema.organisationalUnitsRelations)
					.innerJoin(
						schema.organisationalUnitStatus,
						eq(schema.organisationalUnitsRelations.status, schema.organisationalUnitStatus.id),
					)
					.where(
						and(
							inArray(schema.organisationalUnitsRelations.unitId, unitIds),
							inArray(schema.organisationalUnitsRelations.relatedUnitId, unitIds),
							inArray(schema.organisationalUnitStatus.status, schema.organigramEdgeRelationsEnum),
							sql`${schema.organisationalUnitsRelations.duration} @> NOW()::TIMESTAMPTZ`,
						),
					)
			: [];

	const derivedEdges = relationRows.flatMap((row, index) => {
		const fromNodeId = nodeIdByUnitId.get(row.unitId);
		const toNodeId = nodeIdByUnitId.get(row.relatedUnitId);

		if (fromNodeId == null || toNodeId == null) {
			return [];
		}

		return [
			{
				id: `derived:${fromNodeId}:${toNodeId}:${row.relation}:${index}`,
				fromNodeId,
				toNodeId,
				relation: row.relation,
				position: null,
			},
		];
	});

	return {
		nodes: nodes.map((node) => {
			return {
				id: node.id,
				slug: node.slug,
				label: node.label,
				description: node.description,
				kind: node.kind,
				position: node.position,
				unit: unitsByNodeId.get(node.id) ?? null,
			};
		}),
		edges: [
			...derivedEdges,
			...syntheticEdges.map((edge) => {
				return {
					id: edge.id,
					fromNodeId: edge.fromNodeId,
					toNodeId: edge.toNodeId,
					relation: edge.relation,
					position: edge.position,
				};
			}),
		],
	};
}
