import { appendFileSync } from "node:fs";

import { assert, groupBy, keyBy, log } from "@acdh-oeaw/lib";
import { createDatabaseService } from "@dariah-eric/database";
import * as schema from "@dariah-eric/database/schema";
import { type AssetMetadata, createStorageService } from "@dariah-eric/storage";
import { buffer } from "@dariah-eric/storage/lib";
import slugify from "@sindresorhus/slugify";
import { generateJSON } from "@tiptap/html";
import { StarterKit } from "@tiptap/starter-kit";
import { and, count, eq, ilike } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { placeholderImageUrl } from "../config/data-migration.config";
import { env } from "../config/env.config";
import {
	bodies as unrBodies,
	contributions as unrContributions,
	countries as unrCountries,
	countryToInstitution,
	countryToService as unrCountryToService,
	eventReports as unrEventReports,
	institutions as unrInstitutions,
	institutionService as unrInstitutionToService,
	institutionToPerson as unrInstitutionToPerson,
	outreach as unrOutreach,
	outreachKpis as unrOutreachKpis,
	outreachReports as unrOutreachReports,
	outreachTypeValues as unrOutreachTypeValues,
	persons as unrPersons,
	projects as unrProjects,
	reportCampaigns as unrReportingCampaigns,
	reports as unrReports,
	roles,
	serviceKpis as unrServiceKpis,
	serviceReports as unrServiceReports,
	services as unrServices,
	workingGroupOutreach as unrWorkingGroupOutreach,
	workingGroupReports as unrWorkingGroupReports,
	workingGroups as unrWorkingGroups,
} from "../unr-schema/schema";

interface CampaignQuestionAnswer {
	question: string;
	answer: string;
}

interface CampaignQuestions {
	items: Array<CampaignQuestionAnswer>;
}

interface ReportComment {
	comments: string;
	contributions: string;
	institutions: string;
	eventReports: string;
	outreach: string;
	projectFundingLeverages: string;
	publications: string;
	serviceReports: string;
	software: string;
}

type ReportScreenCommentKey = (typeof schema.reportScreenCommentKeyEnum)[number];
type SocialMediaType = (typeof schema.socialMediaTypesEnum)[number];

const SOCIAL_MEDIA_DOMAINS: Record<SocialMediaType, Array<string>> = {
	bluesky: ["bsky.app"],
	twitter: ["twitter.com", "x.com"],
	facebook: ["facebook.com"],
	instagram: ["instagram.com"],
	linkedin: ["linkedin.com"],
	mastodon: ["mastodon.social"],
	vimeo: ["vimeo.com"],
	youtube: ["youtube.com", "youtu.be"],
	website: [],
	other: [],
};

const db = createDatabaseService({
	connection: {
		database: env.DATABASE_NAME,
		host: env.DATABASE_HOST,
		password: env.DATABASE_PASSWORD,
		port: env.DATABASE_PORT,
		user: env.DATABASE_USER,
	},
	logger: false,
}).unwrap();

const storage = createStorageService({
	config: {
		accessKey: env.S3_ACCESS_KEY,
		bucketName: env.S3_BUCKET_NAME,
		endPoint: env.S3_HOST,
		port: env.S3_PORT,
		secretKey: env.S3_SECRET_KEY,
		useSSL: env.S3_PROTOCOL === "https",
	},
});

const logToFile = (message: string, filepath = "migration.log") => {
	const timestamp = new Date().toISOString();
	const line = `[${timestamp}] ${message}\n`;
	appendFileSync(filepath, line);
};

const detectSocialMediaType = (url: string): SocialMediaType => {
	let hostname;
	try {
		hostname = new URL(url).hostname;
	} catch {
		hostname = url.toLowerCase();
	}
	for (const [type, domains] of Object.entries(SOCIAL_MEDIA_DOMAINS)) {
		if (
			domains.some((domain) => {
				return hostname.includes(domain);
			})
		) {
			return type as SocialMediaType;
		}
	}

	return "other";
};

const unrDB = drizzle(env.UNR_DATABASE_DIRECT_URL);
const client = unrDB;

async function main() {
	const status = await db.query.entityStatus.findMany();
	const statusByType = keyBy(status, (item) => {
		return item.type;
	});

	const types = await db.query.entityTypes.findMany();
	const typesByType = keyBy(types, (item) => {
		return item.type;
	});

	const organisationalUnitTypes = await db.query.organisationalUnitTypes.findMany();
	const organisationalUnitTypesByType = keyBy(organisationalUnitTypes, (item) => {
		return item.type;
	});

	const organisationalUnitStatus = await db.query.organisationalUnitStatus.findMany();
	const organisationalUnitStatusByType = keyBy(organisationalUnitStatus, (item) => {
		return item.status;
	});

	const organisationalUnitServiceRoles = await db.query.organisationalUnitServiceRoles.findMany();
	const organisationalUnitServiceRolesByRole = keyBy(organisationalUnitServiceRoles, (item) => {
		return item.role;
	});

	const personRoleTypes = await db.query.personRoleTypes.findMany();
	const personRoleTypesByType = keyBy(personRoleTypes, (item) => {
		return item.type;
	});

	const projectScopes = await db.query.projectScopes.findMany();
	const projectScopesByScope = keyBy(projectScopes, (item) => {
		return item.scope;
	});

	const projectRoles = await db.query.projectRoles.findMany();
	const projectRolesByRole = keyBy(projectRoles, (item) => {
		return item.role;
	});

	const entityTypes = await db.query.entityTypes.findMany();
	const entityTypesByType = keyBy(entityTypes, (item) => {
		return item.type;
	});

	const contentBlockTypes = await db.query.contentBlockTypes.findMany();
	const contentBlockTypesByType = keyBy(contentBlockTypes, (item) => {
		return item.type;
	});

	const serviceStatuses = await db.query.serviceStatuses.findMany();
	const serviceTypes = await db.query.serviceTypes.findMany();

	const socialMediaTypes = await db.query.socialMediaTypes.findMany();
	const socialMediaTypesByType = keyBy(socialMediaTypes, (item) => {
		return item.type;
	});

	const bodies = await db.query.organisationalUnits.findMany({
		where: {
			typeId: organisationalUnitTypesByType.governance_body.id,
		},
	});

	const unrCountryIdToOrgUnitId = new Map<string, string>();
	const unrInstitutionIdToOrgUnitId = new Map<string, string>();
	const unrWorkingGroupIdToOrgUnitId = new Map<string, string>();
	const unrReportingCampaignIdToReportingCampaignId = new Map<string, string>();
	const unrReportIdToCountryReportId = new Map<string, string>();
	const unrServiceIdToServiceId = new Map<string, string>();
	const unrOutreachIdToSocialMediaId = new Map<string, string>();

	const placeholderInput = await buffer.fromUrl(placeholderImageUrl);
	const placeholderMetadata = await buffer.getMetadata(placeholderInput);

	const umbrellaUnit = await db.query.organisationalUnits.findFirst({
		where: {
			type: {
				type: "eric",
			},
		},
	});

	const { key: placeholderImage } = await storage.images.upload({
		input: placeholderInput,
		prefix: "images",
		metadata: placeholderMetadata,
	});
	const [placeholderAsset] = await db
		.insert(schema.assets)
		.values({
			key: placeholderImage,
			label: "placeholder",
			mimeType: placeholderMetadata["content-type"],
		})
		.returning({ id: schema.assets.id });

	assert(placeholderAsset, "Missing placeholder image.");

	// nothing from unr is public

	/**
	 * ============================================================================================
	 * Working Groups.
	 * ============================================================================================
	 */

	log.info("Migrating working groups...");

	const workingGroups = await client.select().from(unrWorkingGroups);

	for (const workingGroup of workingGroups) {
		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: workingGroup.slug,
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(workingGroup.createdAt),
					updatedAt: new Date(workingGroup.updatedAt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);
			const id = entity.id;
			let asset;

			if (workingGroup.logo != null) {
				let key: string;
				let metadata: AssetMetadata;

				try {
					({ key, metadata } = await storage.objects.copy({
						source: { bucket: env.UNR_S3_BUCKET_NAME, key: workingGroup.logo },
						prefix: "logos",
					}));
					[asset] = await tx
						.insert(schema.assets)
						.values({
							key,
							label: workingGroup.logo,
							mimeType: metadata["content-type"],
						})
						.returning({ id: schema.assets.id });
				} catch (error) {
					console.error(error);
				}
			}

			const [orgUnit] = await tx
				.insert(schema.organisationalUnits)
				.values({
					id,
					name: workingGroup.name,
					typeId: organisationalUnitTypesByType.working_group.id,
					metadata: {
						mailing_list: workingGroup.mailingList,
						member_tracking: workingGroup.memberTracking,
						contact_email: workingGroup.contactEmail,
					},
					sshocMarketplaceActorId: workingGroup.marketplaceId,
					summary: "",
					imageId: asset?.id ?? placeholderAsset.id,
					createdAt: workingGroup.createdAt,
					updatedAt: workingGroup.updatedAt,
				})
				.returning({ id: schema.organisationalUnits.id });

			assert(orgUnit);

			unrWorkingGroupIdToOrgUnitId.set(workingGroup.id, orgUnit.id);

			if (umbrellaUnit) {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: orgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: {
						start: workingGroup.startDate ?? new Date(Date.UTC(1900, 0, 1)),
						end: workingGroup.endDate ?? undefined,
					},
					status: organisationalUnitStatusByType.is_part_of.id,
				});
			}

			if (workingGroup.description == null) {
				return;
			}

			const content = generateJSON(workingGroup.description, [StarterKit]);

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.organisational_units.id,
					fieldName: "description",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});
		});
	}

	const [workingGroupResult] = await db
		.select({ count: count() })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.typeId, organisationalUnitTypesByType.working_group.id));
	assert(workingGroupResult?.count === workingGroups.length);

	/**
	 * ============================================================================================
	 * Countries.
	 * ============================================================================================
	 */

	log.info("Migrating countries...");

	const countries = await client.select().from(unrCountries);

	for (const country of countries) {
		await db.transaction(async (tx) => {
			// create an entity for each country

			const [countryEntity] = await tx
				.insert(schema.entities)
				.values({
					slug: slugify(country.name),
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(country.createdAt),
					updatedAt: new Date(country.updatedAt),
				})
				.returning({ id: schema.entities.id });

			assert(countryEntity);
			const id = countryEntity.id;

			// create an org unit for each country

			const [countryOrgUnit] = await tx
				.insert(schema.organisationalUnits)
				.values({
					id,
					acronym: country.code,
					name: country.name,
					summary: "",
					typeId: organisationalUnitTypesByType.country.id,
					imageId: placeholderAsset.id,
					createdAt: new Date(country.createdAt),
					updatedAt: new Date(country.createdAt),
				})
				.returning({ id: schema.organisationalUnits.id });

			assert(countryOrgUnit);

			unrCountryIdToOrgUnitId.set(country.id, countryOrgUnit.id);

			assert(umbrellaUnit);

			/* actors in the marketplace seem to be consortia,
			but not every country in the country table which has a marketplace id has a consortium name */

			// create an entity for each national consortium

			if (country.marketplaceId != null) {
				const [consortiumEntitiy] = await tx
					.insert(schema.entities)
					.values({
						slug: slugify(country.consortiumName ?? `Consortium ${country.name}`),
						statusId: statusByType.published.id,
						typeId: typesByType.organisational_units.id,
						createdAt: new Date(country.createdAt),
						updatedAt: new Date(country.updatedAt),
					})
					.returning({ id: schema.entities.id });

				assert(consortiumEntitiy);

				const id = consortiumEntitiy.id;
				let asset;

				if (country.logo != null) {
					let key: string;
					let metadata: AssetMetadata;

					try {
						({ key, metadata } = await storage.objects.copy({
							source: { bucket: env.UNR_S3_BUCKET_NAME, key: country.logo },
							prefix: "logos",
						}));
						[asset] = await tx
							.insert(schema.assets)
							.values({
								key,
								label: country.logo,
								mimeType: metadata["content-type"],
							})
							.returning({ id: schema.assets.id });
					} catch (error) {
						console.error(error);
					}
				}

				if (country.description != null) {
					const content = generateJSON(country.description, [StarterKit]);

					const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
						where: {
							entityTypeId: entityTypesByType.organisational_units.id,
							fieldName: "description",
						},
					});

					assert(fieldName);

					const [field] = await tx
						.insert(schema.fields)
						.values({
							entityId: consortiumEntitiy.id,
							fieldNameId: fieldName.id,
						})
						.returning({ id: schema.fields.id });

					assert(field);

					const [contentBlock] = await tx
						.insert(schema.contentBlocks)
						.values({
							position: 0,
							fieldId: field.id,
							typeId: contentBlockTypesByType.rich_text.id,
						})
						.returning({ id: schema.contentBlocks.id });

					assert(contentBlock);

					await tx.insert(schema.richTextContentBlocks).values({
						content,
						id: contentBlock.id,
					});
				}

				// create an org unit for each national consortium

				const [consortiumOrgUnit] = await tx
					.insert(schema.organisationalUnits)
					.values({
						id,
						name: country.consortiumName ?? `Consortium ${country.name}`,
						sshocMarketplaceActorId: country.marketplaceId,
						summary: "",
						typeId: organisationalUnitTypesByType.national_consortium.id,
						imageId: asset?.id ?? placeholderAsset.id,
						createdAt: new Date(country.createdAt),
						updatedAt: new Date(country.createdAt),
					})
					.returning({ id: schema.organisationalUnits.id });

				assert(consortiumOrgUnit);

				// create a relationship between a country and consortium
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: consortiumOrgUnit.id,
					relatedUnitId: countryOrgUnit.id,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) },
					status: organisationalUnitStatusByType.is_national_consortium_of.id,
				});
			}

			// create a relationship between a country and eric

			if (country.type === "member_country") {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: countryOrgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: {
						start: country.startDate ?? new Date(Date.UTC(1900, 0, 1)),
						end: country.endDate ?? undefined,
					},
					status: organisationalUnitStatusByType.is_member_of.id,
				});
			}

			if (country.type === "cooperating_partnership") {
				await tx.insert(schema.organisationalUnitsRelations).values({
					unitId: countryOrgUnit.id,
					relatedUnitId: umbrellaUnit.id,
					duration: {
						start: country.startDate ?? new Date(Date.UTC(1900, 0, 1)),
						end: country.endDate ?? undefined,
					},
					status: organisationalUnitStatusByType.is_cooperating_partner_of.id,
				});
			}
		});
	}

	const [countryOrgUnitResult] = await db
		.select({ count: count() })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.typeId, organisationalUnitTypesByType.country.id));
	assert(countryOrgUnitResult?.count === countries.length);

	/**
	 * ============================================================================================
	 * Instititutions.
	 * ============================================================================================
	 */

	log.info("Migrating institutions...");

	const institutions = await client.select().from(unrInstitutions);

	for (const institution of institutions) {
		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: slugify(institution.name),
					statusId: statusByType.published.id,
					typeId: typesByType.organisational_units.id,
					createdAt: new Date(institution.createdAt),
					updatedAt: new Date(institution.createdAt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const [orgUnit] = await tx
				.insert(schema.organisationalUnits)
				.values({
					id,
					name: institution.name,
					summary: "",
					typeId: organisationalUnitTypesByType.institution.id,
					metadata: { ror: institution.ror, url: institution.url },
					imageId: placeholderAsset.id,
					createdAt: new Date(institution.createdAt),
					updatedAt: new Date(institution.createdAt),
				})
				.returning({ id: schema.organisationalUnits.id });

			assert(orgUnit);

			unrInstitutionIdToOrgUnitId.set(institution.id, orgUnit.id);

			assert(umbrellaUnit);

			if (institution.types != null) {
				let institutionTypes = institution.types.filter((type) => {
					return type !== "other";
				});

				institutionTypes =
					institutionTypes.includes("partner_institution") &&
					institutionTypes.some((t) => {
						return [
							"national_coordinating_institution",
							"national_representative_institution",
							"cooperating_partner",
						].includes(t);
					})
						? institutionTypes.filter((t) => {
								return t !== "partner_institution";
							})
						: institutionTypes;

				for (const type of institutionTypes) {
					if (type === "cooperating_partner") {
						await tx.insert(schema.organisationalUnitsRelations).values({
							unitId: orgUnit.id,
							relatedUnitId: umbrellaUnit.id,
							duration: {
								start: institution.startDate ?? new Date(Date.UTC(1900, 0, 1)),
								end: institution.endDate ?? undefined,
							},
							status: organisationalUnitStatusByType.is_cooperating_partner_of.id,
						});
					}
					if (type === "national_coordinating_institution") {
						await tx.insert(schema.organisationalUnitsRelations).values({
							unitId: orgUnit.id,
							relatedUnitId: umbrellaUnit.id,
							duration: {
								start: institution.startDate ?? new Date(Date.UTC(1900, 0, 1)),
								end: institution.endDate ?? undefined,
							},
							status: organisationalUnitStatusByType.is_national_coordinating_institution_in.id,
						});
					}
					if (type === "national_representative_institution") {
						await tx.insert(schema.organisationalUnitsRelations).values({
							unitId: orgUnit.id,
							relatedUnitId: umbrellaUnit.id,
							duration: {
								start: institution.startDate ?? new Date(Date.UTC(1900, 0, 1)),
								end: institution.endDate ?? undefined,
							},
							status: organisationalUnitStatusByType.is_national_representative_institution_in.id,
						});
					}
					if (type === "partner_institution") {
						await tx.insert(schema.organisationalUnitsRelations).values({
							unitId: orgUnit.id,
							relatedUnitId: umbrellaUnit.id,
							duration: {
								start: institution.startDate ?? new Date(Date.UTC(1900, 0, 1)),
								end: institution.endDate ?? undefined,
							},
							status: organisationalUnitStatusByType.is_partner_institution_of.id,
						});
					}
				}
			}
			const [countryOfInstitution] = await client
				.select({ countryId: countryToInstitution.a })
				.from(countryToInstitution)
				.where(eq(countryToInstitution.b, institution.id))
				.limit(1);

			if (countryOfInstitution?.countryId == null) {
				return;
			}

			const countryOrgaUnitId = unrCountryIdToOrgUnitId.get(countryOfInstitution.countryId);

			assert(countryOrgaUnitId);

			await tx.insert(schema.organisationalUnitsRelations).values({
				unitId: orgUnit.id,
				relatedUnitId: countryOrgaUnitId,
				duration: { start: new Date(Date.UTC(1900, 0, 1)) },
				status: organisationalUnitStatusByType.is_located_in.id,
			});
		});
	}

	const [institutionOrgUnitResult] = await db
		.select({ count: count() })
		.from(schema.organisationalUnits)
		.where(eq(schema.organisationalUnits.typeId, organisationalUnitTypesByType.institution.id));
	assert(institutionOrgUnitResult?.count === institutions.length);

	/**
	 * ============================================================================================
	 * Services.
	 * ============================================================================================
	 */

	log.info("Migrating services...");

	const services = await client.select().from(unrServices);

	for (const service of services) {
		const unrServiceStatus = service.status === "in_preparation" ? "needs_review" : service.status;
		const serviceStatus = serviceStatuses.find((s) => {
			return s.status === unrServiceStatus;
		});
		const serviceType = serviceTypes.find((t) => {
			return t.type === service.type;
		});

		assert(serviceStatus);
		assert(serviceType);

		await db.transaction(async (tx) => {
			const [kbService] = await tx
				.insert(schema.services)
				.values({
					name: service.name,
					statusId: serviceStatus.id,
					typeId: serviceType.id,
					comment: service.comment,
					dariahBranding: service.dariahBranding,
					monitoring: service.monitoring,
					privateSupplier: service.privateSupplier,
					sshocMarketplaceId: service.marketplaceId,
					createdAt: new Date(service.createdAt),
					updatedAt: new Date(service.createdAt),
					metadata: {
						agreements: service.agreements,
						audience: service.audience,
						eosc_onboarding: service.eoscOnboarding,
						marketplace_status: service.marketplaceStatus,
						technical_contact: service.technicalContact,
						technical_readiness_level: service.technicalReadinessLevel,
						url: service.url,
						value_proposition: service.valueProposition,
					},
				})
				.returning({ id: schema.services.id });

			assert(kbService);

			unrServiceIdToServiceId.set(service.id, kbService.id);

			const [institutionOfService] = await client
				.select({
					institutionId: unrInstitutionToService.institutionId,
					role: unrInstitutionToService.role,
				})
				.from(unrInstitutionToService)
				.where(eq(unrInstitutionToService.serviceId, service.id))
				.limit(1);

			if (institutionOfService?.institutionId == null) {
				return;
			}

			const { institutionId, role: unrRole } = institutionOfService;

			const institutionOrgaUnitId = unrInstitutionIdToOrgUnitId.get(institutionId);
			const role = organisationalUnitServiceRoles.find((r) => {
				return r.role === unrRole;
			});

			assert(institutionOrgaUnitId);
			assert(role);

			await tx.insert(schema.servicesToOrganisationalUnits).values({
				serviceId: kbService.id,
				organisationalUnitId: institutionOrgaUnitId,
				roleId: role.id,
			});

			const [countryOfService] = await client
				.select({ countryId: unrCountryToService.a })
				.from(unrCountryToService)
				.where(eq(unrCountryToService.b, service.id))
				.limit(1);

			if (countryOfService?.countryId == null) {
				return;
			}

			const { countryId } = countryOfService;

			const countryOrgaUnitId = unrCountryIdToOrgUnitId.get(countryId);

			assert(countryOrgaUnitId);

			await tx.insert(schema.servicesToOrganisationalUnits).values({
				serviceId: kbService.id,
				organisationalUnitId: countryOrgaUnitId,
				roleId: organisationalUnitServiceRolesByRole.service_provider.id,
			});
		});
	}

	const [serviceResult] = await db.select({ count: count() }).from(schema.services);
	assert(serviceResult?.count === services.length);

	/**
	 * ============================================================================================
	 * Reporting Campaigns.
	 * ============================================================================================
	 */

	const reportingCampaigns = await client.select().from(unrReportingCampaigns);

	for (const reportingCampaign of reportingCampaigns) {
		await db.transaction(async (tx) => {
			const [kbReportingCampaign] = await tx
				.insert(schema.reportingCampaigns)
				.values({
					year: reportingCampaign.year,
					status: "closed",
					createdAt: reportingCampaign.createdAt,
					updatedAt: reportingCampaign.updatedAt,
				})
				.returning({ id: schema.reportingCampaigns.id });

			assert(kbReportingCampaign);

			unrReportingCampaignIdToReportingCampaignId.set(reportingCampaign.id, kbReportingCampaign.id);
		});
	}

	/**
	 * ============================================================================================
	 * Outreach.
	 * ============================================================================================
	 */

	log.info("Migrating outreach...");

	const outreach = await client.select().from(unrOutreach);
	const outreachTypeValues = await client.select().from(unrOutreachTypeValues);
	const workingGroupOutreach = await client.select().from(unrWorkingGroupOutreach);

	for (const outreachItem of outreach) {
		let socialMediaType: SocialMediaType;
		const socialMediaUrl = outreachItem.url;
		switch (outreachItem.type) {
			case "national_website": {
				socialMediaType = "website" as SocialMediaType;
				break;
			}
			case "national_social_media":
			case "social_media": {
				socialMediaType = detectSocialMediaType(socialMediaUrl);
				break;
			}
		}

		await db.transaction(async (tx) => {
			const [kbSocialMedia] = await tx
				.insert(schema.socialMedia)
				.values({
					name: outreachItem.name,
					typeId: socialMediaTypesByType[socialMediaType].id,
					url: outreachItem.url,
					createdAt: new Date(outreachItem.createdAt),
					updatedAt: new Date(outreachItem.createdAt),
				})
				.returning({ id: schema.socialMedia.id });

			assert(kbSocialMedia);

			unrOutreachIdToSocialMediaId.set(outreachItem.id, kbSocialMedia.id);

			if (outreachItem.countryId == null) {
				return;
			}

			const organisationalUnitId = unrCountryIdToOrgUnitId.get(outreachItem.countryId);

			if (organisationalUnitId == null) {
				return;
			}

			await tx.insert(schema.organisationalUnitsToSocialMedia).values({
				organisationalUnitId,
				socialMediaId: kbSocialMedia.id,
				createdAt: new Date(outreachItem.createdAt),
				updatedAt: new Date(outreachItem.createdAt),
			});
		});
	}

	for (const workingGroupOutreachItem of workingGroupOutreach) {
		let socialMediaType: SocialMediaType;
		const socialMediaUrl = workingGroupOutreachItem.url;

		switch (workingGroupOutreachItem.type) {
			case "social_media": {
				socialMediaType = detectSocialMediaType(socialMediaUrl);
				break;
			}
			case "website": {
				socialMediaType = "website";
			}
		}

		await db.transaction(async (tx) => {
			const [kbSocialMedia] = await tx
				.insert(schema.socialMedia)
				.values({
					name: workingGroupOutreachItem.name,
					typeId: socialMediaTypesByType[socialMediaType].id,
					url: workingGroupOutreachItem.url,
					createdAt: new Date(workingGroupOutreachItem.createdAt),
					updatedAt: new Date(workingGroupOutreachItem.createdAt),
				})
				.returning({ id: schema.services.id });

			assert(kbSocialMedia);

			unrOutreachIdToSocialMediaId.set(workingGroupOutreachItem.id, kbSocialMedia.id);

			const organisationalUnitId = unrWorkingGroupIdToOrgUnitId.get(
				workingGroupOutreachItem.workingGroupId,
			);

			if (organisationalUnitId == null) {
				return;
			}

			await tx.insert(schema.organisationalUnitsToSocialMedia).values({
				organisationalUnitId,
				socialMediaId: kbSocialMedia.id,
				createdAt: new Date(workingGroupOutreachItem.createdAt),
				updatedAt: new Date(workingGroupOutreachItem.createdAt),
			});
		});
	}

	for (const outreachTypeValue of outreachTypeValues) {
		const campaignId = unrReportingCampaignIdToReportingCampaignId.get(
			outreachTypeValue.reportCampaignId,
		);
		assert(campaignId);
		const category = outreachTypeValue.type === "national_website" ? "website" : "other";
		const amount = category === "website" ? 5000 : 2000;
		await db
			.insert(schema.reportingCampaignSocialMediaAmounts)
			.values({
				campaignId,
				category,
				amount,
			})
			.onConflictDoNothing({
				target: [
					schema.reportingCampaignSocialMediaAmounts.campaignId,
					schema.reportingCampaignSocialMediaAmounts.category,
				],
			});
	}

	/**
	 * ============================================================================================
	 * Persons.
	 * ============================================================================================
	 */

	log.info("Migrating people...");

	const people = await client.select().from(unrPersons);

	for (const person of people) {
		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: slugify(person.name),
					statusId: statusByType.published.id,
					typeId: typesByType.persons.id,
					createdAt: new Date(person.createdAt),
					updatedAt: new Date(person.updatedAt),
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;
			let asset;

			if (person.image != null) {
				let key: string;
				let metadata: AssetMetadata;

				try {
					({ key, metadata } = await storage.objects.copy({
						source: { bucket: env.UNR_S3_BUCKET_NAME, key: person.image },
						prefix: "avatars",
					}));
					[asset] = await tx
						.insert(schema.assets)
						.values({
							key,
							label: person.image,
							mimeType: metadata["content-type"],
						})
						.returning({ id: schema.assets.id });
				} catch (error) {
					console.error(error);
				}
			}

			const [kbPerson] = await tx
				.insert(schema.persons)
				.values({
					id,
					name: person.name,
					sortName: person.name,
					email: person.email,
					orcid: person.orcid,
					imageId: asset?.id ?? placeholderAsset.id,
					createdAt: person.createdAt,
					updatedAt: person.updatedAt,
				})
				.returning({ id: schema.persons.id });

			if (person.description == null) {
				return;
			}

			const content = generateJSON(person.description, [StarterKit]);

			const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
				where: {
					entityTypeId: entityTypesByType.persons.id,
					fieldName: "biography",
				},
			});

			assert(fieldName);

			const [field] = await tx
				.insert(schema.fields)
				.values({
					entityId: entity.id,
					fieldNameId: fieldName.id,
				})
				.returning({ id: schema.fields.id });

			assert(field);

			const [contentBlock] = await tx
				.insert(schema.contentBlocks)
				.values({
					position: 0,
					fieldId: field.id,
					typeId: contentBlockTypesByType.rich_text.id,
				})
				.returning({ id: schema.contentBlocks.id });

			assert(contentBlock);

			await tx.insert(schema.richTextContentBlocks).values({
				content,
				id: contentBlock.id,
			});

			const institutionsOfPerson = await client
				.select({ institutionId: unrInstitutionToPerson.a })
				.from(unrInstitutionToPerson)
				.where(eq(unrInstitutionToPerson.b, person.id));
			assert(kbPerson);
			for (const institution of institutionsOfPerson) {
				const institutionOrgaUnitId = unrInstitutionIdToOrgUnitId.get(institution.institutionId);

				assert(institutionOrgaUnitId);

				await tx.insert(schema.personsToOrganisationalUnits).values({
					personId: kbPerson.id,
					organisationalUnitId: institutionOrgaUnitId,
					duration: { start: new Date(Date.UTC(1900, 0, 1)) },
					roleTypeId: personRoleTypesByType.is_affiliated_with.id,
				});
			}

			const contributionsByPerson = await client
				.select({
					countryId: unrContributions.countryId,
					personId: unrContributions.personId,
					workingGroupId: unrContributions.workingGroupId,
					startDate: unrContributions.startDate,
					endDate: unrContributions.endDate,
					role: roles.type,
				})
				.from(unrContributions)
				.leftJoin(roles, eq(unrContributions.roleId, roles.id))
				.where(eq(unrContributions.personId, person.id));

			for (const contributionByPerson of contributionsByPerson) {
				const { countryId, role, workingGroupId, startDate, endDate } = contributionByPerson;
				const countryOrgUnitId = countryId != null ? unrCountryIdToOrgUnitId.get(countryId) : null;
				const workingGroupOrgUnitId =
					workingGroupId != null ? unrWorkingGroupIdToOrgUnitId.get(workingGroupId) : null;
				let roleId;
				let relatedOrgaUnitId;

				switch (role) {
					case "national_coordinator":
					case "national_coordinator_deputy":
					case "national_representative":
					case "national_representative_deputy": {
						roleId = personRoleTypesByType[role].id;
						relatedOrgaUnitId = countryOrgUnitId;
						break;
					}
					case "wg_chair": {
						roleId = personRoleTypesByType.is_chair_of.id;
						relatedOrgaUnitId = workingGroupOrgUnitId;
						break;
					}
					case "wg_member": {
						roleId = personRoleTypesByType.is_member_of.id;
						relatedOrgaUnitId = workingGroupOrgUnitId;
						break;
					}
					case "smt_member": {
						roleId = personRoleTypesByType.is_member_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "smt";
						})?.id;
						break;
					}
					case "scientific_board_member": {
						roleId = personRoleTypesByType.is_member_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "sab";
						})?.id;
						break;
					}
					case "dco_member": {
						roleId = personRoleTypesByType.is_member_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "dco";
						})?.id;
						break;
					}
					case "jrc_member": {
						roleId = personRoleTypesByType.is_member_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "jrc";
						})?.id;
						break;
					}
					case "director": {
						roleId = personRoleTypesByType.is_member_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "bod";
						})?.id;
						break;
					}
					case "jrc_chair": {
						roleId = personRoleTypesByType.is_chair_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "jrc";
						})?.id;
						break;
					}
					case "ncc_chair": {
						roleId = personRoleTypesByType.is_chair_of.id;
						relatedOrgaUnitId = bodies.find((b) => {
							return b.acronym === "ncc";
						})?.id;
						break;
					}
					case "national_consortium_contact":
					case "cooperating_partner_contact":
					case null: {
						break;
					}
				}

				assert(roleId);
				assert(relatedOrgaUnitId);

				await tx.insert(schema.personsToOrganisationalUnits).values({
					personId: kbPerson.id,
					organisationalUnitId: relatedOrgaUnitId,
					duration: {
						start: startDate ?? new Date(Date.UTC(1900, 0, 1)),
						end: endDate ?? undefined,
					},
					roleTypeId: roleId,
				});
			}
		});
	}

	/**
	 * ============================================================================================
	 * Bodies.
	 * ============================================================================================
	 */

	log.info("Migrating bodies...");

	for (const body of bodies) {
		await db.transaction(async (tx) => {
			//  sb from unr changed to sab in kb
			const unrAcronym = body.acronym === "sab" ? "sb" : body.acronym;
			assert(unrAcronym);
			const [unrBody] = await client
				.select()
				.from(unrBodies)
				.where(ilike(unrBodies.acronym, unrAcronym));

			assert(unrBody);

			if (unrBody.description != null) {
				const content = generateJSON(unrBody.description, [StarterKit]);

				const fieldName = await tx.query.entityTypesFieldsNames.findFirst({
					where: {
						entityTypeId: entityTypesByType.organisational_units.id,
						fieldName: "description",
					},
				});

				assert(fieldName);

				const [field] = await tx
					.insert(schema.fields)
					.values({
						entityId: body.id,
						fieldNameId: fieldName.id,
					})
					.returning({ id: schema.fields.id });

				assert(field);

				const [contentBlock] = await tx
					.insert(schema.contentBlocks)
					.values({
						position: 0,
						fieldId: field.id,
						typeId: contentBlockTypesByType.rich_text.id,
					})
					.returning({ id: schema.contentBlocks.id });

				assert(contentBlock);

				await tx.insert(schema.richTextContentBlocks).values({
					content,
					id: contentBlock.id,
				});
			}
		});
	}

	/**
	 * ============================================================================================
	 * Reports.
	 * ============================================================================================
	 */

	log.info("Migrating reports...");

	const reports = await client.select().from(unrReports);
	const outreachKpis = await client.select().from(unrOutreachKpis);
	const serviceKpis = await client.select().from(unrServiceKpis);
	const workingGroupReports = await client.select().from(unrWorkingGroupReports);

	for (const report of reports) {
		const campaignId = unrReportingCampaignIdToReportingCampaignId.get(report.reportCampaignId);
		const countryId = unrCountryIdToOrgUnitId.get(report.countryId);
		const [eventReports] = await client
			.select()
			.from(unrEventReports)
			.where(eq(unrEventReports.reportId, report.id));

		assert(campaignId);
		assert(countryId);

		await db.transaction(async (tx) => {
			const [countryReportId] = await tx
				.insert(schema.countryReports)
				.values({
					campaignId,
					countryId,
					status: "accepted",
					dariahCommissionedEvent: eventReports?.dariahCommissionedEvent,
					smallEvents: eventReports?.smallMeetings,
					mediumEvents: eventReports?.mediumMeetings,
					largeEvents: eventReports?.largeMeetings,
					veryLargeEvents: eventReports?.veryLargeMeetings,
					totalContributors: report.contributionsCount,
					reusableOutcomes: eventReports?.reusableOutcomes,
					createdAt: report.createdAt,
					updatedAt: report.updatedAt,
				})
				.returning({ id: schema.countryReports.id });

			assert(countryReportId);

			unrReportIdToCountryReportId.set(report.id, countryReportId.id);

			if (report.comments != null) {
				for (const [k, v] of Object.entries(report.comments as ReportComment)) {
					let screenKey = k;
					switch (k) {
						case "outreach": {
							screenKey = "social-media";
							break;
						}
						case "contributions": {
							screenKey = "contributors";
							break;
						}
						case "eventReports": {
							screenKey = "events";
							break;
						}
						case "serviceReports": {
							screenKey = "services";
							break;
						}
						case "projectFundingLeverages": {
							screenKey = "projects";
						}
					}

					await tx.insert(schema.reportScreenComments).values({
						comment: generateJSON(String(v), [StarterKit]),
						reportType: "country",
						reportId: report.id,
						screenKey: screenKey as ReportScreenCommentKey,
						createdAt: report.createdAt,
						updatedAt: report.updatedAt,
					});
				}
			}
		});
	}

	for (const serviceKpi of serviceKpis) {
		const [serviceReport] = await client
			.select()
			.from(unrServiceReports)
			.where(eq(unrServiceReports.id, serviceKpi.serviceReportId));
		assert(serviceReport);
		const countryReportId = unrReportIdToCountryReportId.get(serviceReport.reportId);
		assert(countryReportId);
		const serviceId = unrServiceIdToServiceId.get(serviceReport.serviceId);

		assert(serviceId);

		await db.transaction(async (tx) => {
			const [countryReportServiceKpi] = await tx
				.insert(schema.countryReportServiceKpis)
				.values({
					serviceId,
					countryReportId,
					kpi: serviceKpi.unit,
					value: serviceKpi.value,
				})
				.onConflictDoNothing({
					target: [
						schema.countryReportServiceKpis.countryReportId,
						schema.countryReportServiceKpis.serviceId,
						schema.countryReportServiceKpis.kpi,
					],
				})
				.returning({
					id: schema.countryReportServiceKpis.id,
				});
			if (!countryReportServiceKpi) {
				const [service] = await tx
					.select()
					.from(schema.services)
					.where(eq(schema.services.id, serviceId));
				assert(service);
				logToFile(`skipped duplicated entry ${serviceKpi.unit} for service ${service.name}.`);
			}
		});
	}

	for (const outreachKpi of outreachKpis) {
		const [outReachReport] = await client
			.select()
			.from(unrOutreachReports)
			.where(eq(unrOutreachReports.id, outreachKpi.outreachReportId));
		assert(outReachReport);
		const countryReportId = unrReportIdToCountryReportId.get(outReachReport.reportId);
		assert(countryReportId);
		const socialMediaId = unrOutreachIdToSocialMediaId.get(outReachReport.outreachId);
		assert(socialMediaId);

		await db.transaction(async (tx) => {
			const [countryReportSocialMediaKpi] = await tx
				.insert(schema.countryReportSocialMediaKpis)
				.values({
					socialMediaId,
					countryReportId,
					kpi: outreachKpi.unit === "mention" ? "mentions" : outreachKpi.unit,
					value: outreachKpi.value,
				})
				.onConflictDoNothing({
					target: [
						schema.countryReportSocialMediaKpis.countryReportId,
						schema.countryReportSocialMediaKpis.socialMediaId,
						schema.countryReportSocialMediaKpis.kpi,
					],
				})
				.returning({
					id: schema.countryReportSocialMediaKpis.id,
				});
			if (!countryReportSocialMediaKpi) {
				const [socialMedia] = await tx
					.select()
					.from(schema.socialMedia)
					.where(eq(schema.socialMedia.id, socialMediaId));
				assert(socialMedia);
				logToFile(`skipped duplicated entry ${outreachKpi.unit} for service ${socialMedia.name}.`);
			}
		});
	}

	let i = 0;
	for (const workingGroupReport of workingGroupReports) {
		const reportCampaignId = unrReportingCampaignIdToReportingCampaignId.get(
			workingGroupReport.reportCampaignId,
		);
		const workingGroupId = unrWorkingGroupIdToOrgUnitId.get(workingGroupReport.workingGroupId);

		assert(reportCampaignId);
		assert(workingGroupId);

		await db.transaction(async (tx) => {
			const [kbWorkingGroupReport] = await tx
				.insert(schema.workingGroupReports)
				.values({
					campaignId: reportCampaignId,
					workingGroupId,
					numberOfMembers: workingGroupReport.members,
					status: "accepted",
					createdAt: workingGroupReport.createdAt,
					updatedAt: workingGroupReport.updatedAt,
				})
				.returning({ id: schema.workingGroupReports.id });

			assert(kbWorkingGroupReport);

			const campaignQuestions: Array<CampaignQuestionAnswer> = [
				...(workingGroupReport.narrativeQuestionsList as CampaignQuestions).items,
				...(workingGroupReport.facultativeQuestionsList as CampaignQuestions).items,
			];

			for (const { question, answer } of campaignQuestions) {
				i++;
				const [wgReportQuestion]: Array<{ id: string }> = await tx
					.insert(schema.workingGroupReportQuestions)
					.values({
						campaignId: reportCampaignId,
						question: generateJSON(question, [StarterKit]),
						position: i,
					})
					.returning({ id: schema.workingGroupReportQuestions.id });

				assert(wgReportQuestion);

				await tx
					.insert(schema.workingGroupReportAnswers)
					.values({
						questionId: wgReportQuestion.id,
						workingGroupReportId: kbWorkingGroupReport.id,
						answer: generateJSON(answer, [StarterKit]),
					})
					.returning({ id: schema.workingGroupReportAnswers.id });
			}
			if (workingGroupReport.comments != null) {
				for (const comment of Object.values(workingGroupReport.comments as ReportComment)) {
					await tx.insert(schema.reportScreenComments).values({
						comment: generateJSON(String(comment), [StarterKit]),
						reportType: "working_group",
						reportId: workingGroupReport.id,
						screenKey: "data",
						createdAt: workingGroupReport.createdAt,
						updatedAt: workingGroupReport.updatedAt,
					});
				}
			}
		});
	}

	/**
	 * ============================================================================================
	 * Projects.
	 * ============================================================================================
	 */

	log.info("Migrating projects...");

	const projects = await client.select().from(unrProjects);

	const groupedProjects = groupBy(projects, ({ acronym, name }) => {
		return acronym ?? name;
	});

	for (const [projectName, projectLeverages] of Object.entries(groupedProjects)) {
		const createdAt = new Date(Date.now());

		await db.transaction(async (tx) => {
			const [entity] = await tx
				.insert(schema.entities)
				.values({
					slug: slugify(projectName),
					statusId: statusByType.published.id,
					typeId: typesByType.projects.id,
					createdAt,
					updatedAt: createdAt,
				})
				.returning({ id: schema.entities.id });

			assert(entity);

			const id = entity.id;

			const startDates = [
				...new Set(
					projectLeverages.map((pL) => {
						return pL.startDate?.getTime();
					}),
				),
			]
				.toSorted((dateA = 0, dateB = 0) => {
					return dateA - dateB;
				})
				.map((time) => {
					return time != null ? new Date(time) : null;
				})
				.filter((d) => {
					return d != null;
				});

			const projectMonthsEntries = [
				...new Set(
					projectLeverages.map((pL) => {
						return pL.projectMonths;
					}),
				),
			];

			if (startDates.length > 1) {
				logToFile(
					`multiple start dates found for project ${projectName}: ${startDates
						.map((startDate) => {
							return startDate.toISOString().slice(0, 10);
						})
						.join(",")}. Chose ${String(startDates[0]?.toISOString().slice(0, 10))}`,
				);
			}
			if (projectMonthsEntries.length > 1) {
				logToFile(
					`multiple project months entries found for project ${projectName}: ${projectMonthsEntries
						.map((pM) => {
							return pM;
						})
						.join(",")}. Chose ${String(projectMonthsEntries[0])}`,
				);
			}

			const startDate = startDates[0] ?? new Date(Date.UTC(1900, 0, 1));
			const projectMonths = projectMonthsEntries[0] ?? null;

			const endDate =
				projectMonths != null
					? new Date(
							new Date(startDate).setUTCMonth(new Date(startDate).getUTCMonth() + projectMonths),
						)
					: null;

			const projectScopes = [
				...new Set(
					projectLeverages.map((pL) => {
						return pL.scope;
					}),
				),
			];

			const projectScope = projectScopes[0] ?? "national";

			const [kbProject] = await tx
				.insert(schema.projects)
				.values({
					id,
					acronym: projectLeverages[0]?.acronym,
					duration: {
						start: startDate,
						end: endDate ?? undefined,
					},
					scopeId: projectScopesByScope[projectScope].id,
					summary: "",
					name: projectName,
					createdAt,
					updatedAt: createdAt,
				})
				.returning({ id: schema.projects.id, duration: schema.projects.duration });

			assert(kbProject);

			const fundersEntries = projectLeverages.map((pL) => {
				return pL.funders;
			});
			const funders = [
				...new Set(
					fundersEntries.flatMap((s) => {
						return s != null
							? s.split(";").map((v) => {
									return v.trim();
								})
							: [];
					}),
				),
			];
			funders.filter((f) => {
				return f !== "Unknown";
			});
			for (const funder of funders) {
				let [fundingUnit] = await tx
					.select({ id: schema.organisationalUnits.id })
					.from(schema.organisationalUnits)
					.where(
						and(
							eq(schema.organisationalUnits.name, funder),
							eq(schema.organisationalUnits.typeId, organisationalUnitTypesByType.institution.id),
						),
					);
				if (!fundingUnit) {
					const [fundingUnitEntity] = await tx
						.insert(schema.entities)
						.values({
							slug: slugify(funder),
							statusId: statusByType.published.id,
							typeId: typesByType.organisational_units.id,
							createdAt,
							updatedAt: createdAt,
						})
						.returning({ id: schema.entities.id });

					assert(fundingUnitEntity);

					const fundingUnitEntityId = fundingUnitEntity.id;

					[fundingUnit] = await tx
						.insert(schema.organisationalUnits)
						.values({
							id: fundingUnitEntityId,
							name: funder,
							summary: "",
							typeId: organisationalUnitTypesByType.institution.id,
							imageId: placeholderAsset.id,
							createdAt,
							updatedAt: createdAt,
						})
						.returning({ id: schema.organisationalUnits.id });
				}
				assert(fundingUnit);

				await tx.insert(schema.projectsToOrganisationalUnits).values({
					projectId: kbProject.id,
					unitId: fundingUnit.id,
					roleId: projectRolesByRole.funder.id,
					duration: kbProject.duration,
				});
			}
			for (const projectLeverage of projectLeverages) {
				const countryReportId = unrReportIdToCountryReportId.get(projectLeverage.reportId);
				assert(countryReportId);

				const [countryReportProjectContributionId] = await tx
					.insert(schema.countryReportProjectContributions)
					.values({
						projectId: kbProject.id,
						amountEuros: Number(projectLeverage.amount),
						countryReportId,
					})
					.onConflictDoNothing({
						target: [
							schema.countryReportProjectContributions.projectId,
							schema.countryReportProjectContributions.countryReportId,
						],
					})
					.returning({
						id: schema.countryReportProjectContributions.id,
					});
				if (!countryReportProjectContributionId) {
					logToFile(`skipped duplicated entry for ${projectName}.`);
				}
			}
		});
	}
}

main()
	.catch((error: unknown) => {
		log.error("Failed to complete data migration.", error);
		process.exitCode = 1;
	})
	.finally(() => {
		return db.$client.end().catch((error: unknown) => {
			log.error("Failed to close database connection.\n", error);
			process.exitCode = 1;
		});
	});
