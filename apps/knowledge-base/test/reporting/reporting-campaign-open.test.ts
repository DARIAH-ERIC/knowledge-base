import { randomBytes, randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { describe, expect, it, vi } from "vitest";

import { getReportingCampaignReadiness } from "@/lib/data/reporting-campaign-readiness";
import type * as DbModule from "@/lib/db";
import type { Transaction } from "@/lib/db";
import { and, eq } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

/**
 * Reporting campaigns are annual, so at most one is open at a time. Campaigns are created as drafts
 * and only the launch action opens one: it refuses to open a second one, or a campaign whose
 * amounts are not all set. A closed campaign's amounts and questions can no longer be changed.
 *
 * The actions write through the shared `db`. Route it to the test's transaction (the actions' own
 * `db.transaction` calls nest as savepoints), so everything is rolled back with it.
 */
const { currentTx, currentUser } = vi.hoisted(() => {
	const currentTx: { value: Transaction | null } = { value: null };
	const currentUser: { value: User | null } = { value: null };
	return { currentTx, currentUser };
});

vi.mock("@/lib/db", async (importOriginal) => {
	const actual = await importOriginal<typeof DbModule>();
	const db = new Proxy(actual.db, {
		get(target, property) {
			const executor = currentTx.value ?? target;
			const value: unknown = Reflect.get(executor, property);
			return typeof value === "function"
				? (value as (...args: Array<unknown>) => unknown).bind(executor)
				: value;
		},
	});
	return { ...actual, db };
});

vi.mock("@/lib/auth/session", () => {
	const session = () =>
		Promise.resolve({
			user: currentUser.value,
			realUser: currentUser.value,
			isImpersonating: false,
		});
	return { assertAuthenticated: session, assertAdmin: session };
});

vi.mock("next/server", () => {
	return { after: vi.fn() };
});

vi.mock("next/cache", () => {
	return { revalidatePath: vi.fn() };
});

vi.mock("next-intl/server", () => {
	return {
		getLocale: vi.fn().mockResolvedValue("en"),
		getExtracted: vi.fn().mockResolvedValue((key: string) => key),
	};
});

vi.mock("@dariah-eric/next-lib/rate-limiter", () => {
	return { globalPostRequestRateLimit: vi.fn().mockResolvedValue(true) };
});

/** The actions redirect on success; a no-op lets them return their state instead. */
vi.mock("@/lib/navigation/navigation", () => {
	return { redirect: vi.fn() };
});

const { createReportingCampaignAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/create-reporting-campaign.action");
const { launchReportingCampaignAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/launch-reporting-campaign.action");
const { updateReportingCampaignAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/update-reporting-campaign.action");
const { upsertCampaignEventAmountsAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-event-amounts.action");
const { upsertCampaignServiceSizesAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/upsert-campaign-service-sizes.action");
const { copyWorkingGroupReportQuestionsAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/copy-working-group-report-questions.action");
const { createWorkingGroupReportQuestionAction } =
	await import("@/app/(app)/[locale]/(dashboard)/dashboard/administrator/reporting-campaigns/_lib/create-working-group-report-question.action");
const { createDraftDocument, createPublishedDocument } =
	await import("@/lib/data/entity-lifecycle");
const { getDariahEricDocumentId } = await import("@/lib/data/unit-relations");

type Tx = Transaction;
type CampaignStatus = (typeof schema.reportingCampaignStatusEnum)[number];

/**
 * Runs `fn` as a signed-in admin in a rolled-back transaction that the actions write through as
 * well. Campaigns already in the database are closed first, so each test starts from "none open".
 */
async function withAdminTransaction(fn: (tx: Tx) => Promise<void>): Promise<void> {
	await withTransaction(async (tx) => {
		currentTx.value = tx;
		try {
			await tx
				.update(schema.reportingCampaigns)
				.set({ status: "closed" })
				.where(eq(schema.reportingCampaigns.status, "open"));

			const [row] = await tx
				.insert(schema.users)
				.values({
					email: `${randomUUID()}@example.com`,
					name: "test-admin",
					passwordHash: "not-a-real-hash",
					twoFactorRecoveryCode: randomBytes(16),
					role: "admin",
					isEmailVerified: true,
				})
				.returning({ id: schema.users.id });
			assert(row);
			currentUser.value = {
				id: row.id,
				role: "admin",
				personDocumentId: null,
				organisationalUnitDocumentId: null,
			} as unknown as User;

			await fn(tx);
		} finally {
			currentTx.value = null;
			currentUser.value = null;
		}
	});
}

/** A year no real campaign uses; `year` is unique. */
function unusedYear(): number {
	return 4000 + Math.floor(Math.random() * 5000);
}

async function seedCampaign(tx: Tx, status: CampaignStatus, year = unusedYear()): Promise<string> {
	const [row] = await tx
		.insert(schema.reportingCampaigns)
		.values({ year, status })
		.returning({ id: schema.reportingCampaigns.id });
	assert(row);
	return row.id;
}

/** Sets every amount the launch checks require; country thresholds and questions are left empty. */
async function seedCampaignAmounts(tx: Tx, campaignId: string): Promise<void> {
	await tx.insert(schema.reportingCampaignEventAmounts).values(
		schema.reportingCampaignEventTypeEnum.map((eventType) => {
			return {
				campaignId,
				eventType,
				amount: 1,
			};
		}),
	);
	await tx.insert(schema.reportingCampaignSocialMediaAmounts).values(
		schema.reportingCampaignSocialMediaCategoryEnum.map((category) => {
			return {
				campaignId,
				category,
				amount: 1,
			};
		}),
	);
	await tx.insert(schema.reportingCampaignContributionAmounts).values(
		schema.reportingCampaignContributionRoleEnum.map((roleType) => {
			return {
				campaignId,
				roleType,
				amount: 1,
			};
		}),
	);
	await tx.insert(schema.reportingCampaignServiceSizes).values(
		schema.serviceSizeEnum.map((serviceSize, index) => {
			return {
				campaignId,
				serviceSize,
				visitsThreshold: serviceSize === "core" || serviceSize === "important" ? null : index * 100,
				amount: 1,
			};
		}),
	);
}

async function getStatus(tx: Tx, id: string): Promise<CampaignStatus | undefined> {
	const row = await tx.query.reportingCampaigns.findFirst({
		where: { id },
		columns: { status: true },
	});
	return row?.status;
}

function toFormData(values: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) {
		formData.set(key, value);
	}
	return formData;
}

describe("at most one open reporting campaign", () => {
	it("launches a draft campaign when no other campaign is open", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");
			await seedCampaignAmounts(tx, draft);

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");
			expect(await getStatus(tx, draft)).toBe("open");
		});
	});

	it("refuses to launch a campaign while another one is open", async () => {
		await withAdminTransaction(async (tx) => {
			await seedCampaign(tx, "open");
			const draft = await seedCampaign(tx, "draft");
			await seedCampaignAmounts(tx, draft);

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, draft)).toBe("draft");
		});
	});
});

describe("opening a campaign requires its amounts", () => {
	it("refuses to launch a draft campaign with missing amounts", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, draft)).toBe("draft");
		});
	});

	it("refuses a service size without a visit threshold", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");
			await seedCampaignAmounts(tx, draft);
			await tx
				.update(schema.reportingCampaignServiceSizes)
				.set({ visitsThreshold: null })
				.where(eq(schema.reportingCampaignServiceSizes.campaignId, draft));

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, draft)).toBe("draft");
		});
	});
});

describe("service size visit thresholds", () => {
	it("refuses to launch without a threshold for small services", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");
			await seedCampaignAmounts(tx, draft);
			await tx
				.update(schema.reportingCampaignServiceSizes)
				.set({ visitsThreshold: null })
				.where(
					and(
						eq(schema.reportingCampaignServiceSizes.campaignId, draft),
						eq(schema.reportingCampaignServiceSizes.serviceSize, "small"),
					),
				);

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(state.status === "error" ? state.message : "").toContain(
				"Services: {count} visit thresholds are missing.",
			);
			expect(await getStatus(tx, draft)).toBe("draft");
		});
	});

	it("reports missing thresholds even when the service size has no amount either", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");
			const readiness = await getReportingCampaignReadiness(draft);

			expect(readiness?.missing.visitsThresholds).toEqual(["small", "medium", "large"]);
		});
	});

	it("refuses to launch with thresholds out of order", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");
			await seedCampaignAmounts(tx, draft);
			await tx
				.update(schema.reportingCampaignServiceSizes)
				.set({ visitsThreshold: 0 })
				.where(
					and(
						eq(schema.reportingCampaignServiceSizes.campaignId, draft),
						eq(schema.reportingCampaignServiceSizes.serviceSize, "large"),
					),
				);

			const readiness = await getReportingCampaignReadiness(draft);
			expect(readiness?.unorderedVisitsThresholds).toEqual(["large"]);

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, draft)).toBe("draft");
		});
	});

	it("refuses to save thresholds out of order", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");

			const state = await upsertCampaignServiceSizesAction(
				createActionStateInitial(),
				toFormData({
					id: draft,
					medium_threshold: "10000",
					medium_amount: "20",
					large_threshold: "5000",
					large_amount: "30",
				}),
			);
			expect(state.status).toBe("error");
			expect(state.status === "error" ? state.validationErrors : undefined).toHaveProperty(
				"large_threshold",
			);

			const rows = await tx.query.reportingCampaignServiceSizes.findMany({
				where: { campaignId: draft },
			});
			expect(rows).toHaveLength(0);
		});
	});

	it("refuses to save a threshold without its amount", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");

			const state = await upsertCampaignServiceSizesAction(
				createActionStateInitial(),
				toFormData({ id: draft, medium_threshold: "5000" }),
			);
			expect(state.status).toBe("error");
			expect(state.status === "error" ? state.validationErrors : undefined).toHaveProperty(
				"medium_amount",
			);

			const rows = await tx.query.reportingCampaignServiceSizes.findMany({
				where: { campaignId: draft },
			});
			expect(rows).toHaveLength(0);
		});
	});
});

describe("important services", () => {
	it("launches without a visits threshold for important services", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");
			await seedCampaignAmounts(tx, draft);

			const readiness = await getReportingCampaignReadiness(draft);
			expect(readiness?.missing.visitsThresholds).toEqual([]);
			expect(readiness?.isReady).toBe(true);
		});
	});

	it("saves the important amount without a visits threshold", async () => {
		await withAdminTransaction(async (tx) => {
			const draft = await seedCampaign(tx, "draft");

			const state = await upsertCampaignServiceSizesAction(
				createActionStateInitial(),
				toFormData({ id: draft, important_amount: "50" }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");

			const rows = await tx.query.reportingCampaignServiceSizes.findMany({
				where: { campaignId: draft },
				columns: { serviceSize: true, visitsThreshold: true, amount: true },
			});
			expect(rows).toEqual([{ serviceSize: "important", visitsThreshold: null, amount: 50 }]);
		});
	});
});

describe("closed campaigns are read-only", () => {
	const question = JSON.stringify({
		type: "doc",
		content: [{ type: "paragraph", content: [{ type: "text", text: "Question?" }] }],
	});

	it("refuses to change the amounts or questions of a closed campaign", async () => {
		await withAdminTransaction(async (tx) => {
			const closed = await seedCampaign(tx, "closed");

			const amounts = await upsertCampaignEventAmountsAction(
				createActionStateInitial(),
				toFormData({ id: closed, small: "10" }),
			);
			expect(amounts.status).toBe("error");
			expect(
				await tx.query.reportingCampaignEventAmounts.findFirst({ where: { campaignId: closed } }),
			).toBeUndefined();

			const added = await createWorkingGroupReportQuestionAction(
				createActionStateInitial(),
				toFormData({ campaignId: closed, question }),
			);
			expect(added.status).toBe("error");
			expect(
				await tx.query.workingGroupReportQuestions.findFirst({ where: { campaignId: closed } }),
			).toBeUndefined();
		});
	});

	it("lets the amounts and questions of an open campaign be changed", async () => {
		await withAdminTransaction(async (tx) => {
			const open = await seedCampaign(tx, "open");

			const amounts = await upsertCampaignEventAmountsAction(
				createActionStateInitial(),
				toFormData({ id: open, small: "10" }),
			);
			expect(amounts.status, JSON.stringify(amounts)).toBe("success");

			const added = await createWorkingGroupReportQuestionAction(
				createActionStateInitial(),
				toFormData({ campaignId: open, question }),
			);
			expect(added.status, JSON.stringify(added)).toBe("success");
		});
	});
});

describe("only the launch and close actions change a campaign's status", () => {
	it("creates campaigns as drafts, whatever status is submitted", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();

			const state = await createReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ year: String(year), status: "open" }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");
			const created = await tx.query.reportingCampaigns.findFirst({
				where: { year },
				columns: { status: true },
			});
			expect(created?.status).toBe("draft");
		});
	});

	it("updates the year but ignores a submitted status", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const closed = await seedCampaign(tx, "closed", year);

			const state = await updateReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: closed, year: String(year + 1), status: "draft" }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");
			const updated = await tx.query.reportingCampaigns.findFirst({
				where: { id: closed },
				columns: { status: true, year: true },
			});
			expect(updated).toEqual({ status: "closed", year: year + 1 });
		});
	});
});

describe("copying questions from the previous campaign", () => {
	function questionContent(text: string) {
		return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
	}

	async function seedQuestions(tx: Tx, campaignId: string, texts: Array<string>): Promise<void> {
		await tx.insert(schema.workingGroupReportQuestions).values(
			texts.map((text, index) => {
				return { campaignId, question: questionContent(text), position: index + 1 };
			}),
		);
	}

	async function getQuestionTexts(tx: Tx, campaignId: string): Promise<Array<string>> {
		const rows = await tx.query.workingGroupReportQuestions.findMany({
			where: { campaignId },
			columns: { question: true },
			orderBy: { position: "asc" },
		});
		return rows.map((row) => JSON.stringify(row.question));
	}

	it("copies the questions of the latest earlier campaign, in order", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const older = await seedCampaign(tx, "closed", year - 2);
			const previous = await seedCampaign(tx, "closed", year - 1);
			const draft = await seedCampaign(tx, "draft", year);
			await seedQuestions(tx, older, ["Older?"]);
			await seedQuestions(tx, previous, ["First?", "Second?"]);

			const state = await copyWorkingGroupReportQuestionsAction(
				createActionStateInitial(),
				toFormData({ campaignId: draft }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");
			expect(await getQuestionTexts(tx, draft)).toStrictEqual(await getQuestionTexts(tx, previous));
		});
	});

	it("refuses to copy into a campaign that already has questions", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const previous = await seedCampaign(tx, "closed", year - 1);
			const draft = await seedCampaign(tx, "draft", year);
			await seedQuestions(tx, previous, ["Previous?"]);
			await seedQuestions(tx, draft, ["Own?"]);

			const state = await copyWorkingGroupReportQuestionsAction(
				createActionStateInitial(),
				toFormData({ campaignId: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getQuestionTexts(tx, draft)).toHaveLength(1);
		});
	});

	it("refuses to copy into a closed campaign", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const previous = await seedCampaign(tx, "closed", year - 1);
			const closed = await seedCampaign(tx, "closed", year);
			await seedQuestions(tx, previous, ["Previous?"]);

			const state = await copyWorkingGroupReportQuestionsAction(
				createActionStateInitial(),
				toFormData({ campaignId: closed }),
			);
			expect(state.status).toBe("error");
			expect(await getQuestionTexts(tx, closed)).toHaveLength(0);
		});
	});
});

describe("launching a campaign creates its reports", () => {
	type UnitType = "country" | "working_group";

	/** Seeds an organisational unit, published unless `isDraft`, and returns its document id. */
	async function seedUnit(tx: Tx, type: UnitType, isDraft = false): Promise<string> {
		const entityType = await tx.query.entityTypes.findFirst({
			where: { type: "organisational_units" },
			columns: { id: true },
		});
		const unitType = await tx.query.organisationalUnitTypes.findFirst({
			where: { type },
			columns: { id: true },
		});
		assert(entityType);
		assert(unitType);

		const create = isDraft ? createDraftDocument : createPublishedDocument;
		const { documentId, versionId } = await create(
			tx,
			entityType.id,
			`test-${type}-${randomUUID()}`,
		);
		await tx.insert(schema.organisationalUnits).values({
			id: versionId,
			name: `Test ${type} ${documentId.slice(0, 8)}`,
			typeId: unitType.id,
		});
		return documentId;
	}

	/**
	 * Relates `unitDocumentId` to DARIAH ERIC from `start` until `end` inclusive (open-ended when
	 * omitted).
	 */
	async function seedEricRelation(
		tx: Tx,
		unitDocumentId: string,
		status: (typeof schema.organisationalUnitStatusEnum)[number],
		start: string,
		end?: string,
	): Promise<void> {
		const ericDocumentId = await getDariahEricDocumentId(tx);
		const relationStatus = await tx.query.organisationalUnitStatus.findFirst({
			where: { status },
			columns: { id: true },
		});
		assert(ericDocumentId, "DARIAH ERIC not seeded");
		assert(relationStatus);

		await tx.insert(schema.organisationalUnitsRelations).values({
			unitDocumentId,
			relatedUnitDocumentId: ericDocumentId,
			status: relationStatus.id,
			duration: { start: new Date(start), end: end != null ? new Date(end) : undefined },
		});
	}

	async function getCountryReports(tx: Tx, campaignId: string) {
		return tx.query.countryReports.findMany({
			where: { campaignId },
			columns: { countryDocumentId: true, status: true },
		});
	}

	async function getWorkingGroupReports(tx: Tx, campaignId: string) {
		return tx.query.workingGroupReports.findMany({
			where: { campaignId },
			columns: { workingGroupDocumentId: true, status: true },
		});
	}

	it("creates a draft report for every country and working group active in the campaign year", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const draft = await seedCampaign(tx, "draft", year);
			await seedCampaignAmounts(tx, draft);

			const member = await seedUnit(tx, "country");
			await seedEricRelation(tx, member, "is_member_of", `${year - 3}-01-01`);
			const observerUntilMarch = await seedUnit(tx, "country");
			await seedEricRelation(
				tx,
				observerUntilMarch,
				"is_observer_of",
				`${year - 3}-01-01`,
				`${year}-03-01`,
			);
			const memberFromOctober = await seedUnit(tx, "country");
			await seedEricRelation(tx, memberFromOctober, "is_member_of", `${year}-10-01`);

			// Durations are inclusive, and editors enter calendar dates: leaving at the end of last year
			// is stored as an end on 31 December.
			const memberUntilLastYear = await seedUnit(tx, "country");
			await seedEricRelation(
				tx,
				memberUntilLastYear,
				"is_member_of",
				`${year - 3}-01-01`,
				`${year - 1}-12-31`,
			);
			const memberFromNextYear = await seedUnit(tx, "country");
			await seedEricRelation(tx, memberFromNextYear, "is_member_of", `${year + 1}-01-01`);
			const cooperatingPartner = await seedUnit(tx, "country");
			await seedEricRelation(
				tx,
				cooperatingPartner,
				"is_cooperating_partner_of",
				`${year - 3}-01-01`,
			);
			const unpublished = await seedUnit(tx, "country", true);
			await seedEricRelation(tx, unpublished, "is_member_of", `${year - 3}-01-01`);

			const activeWorkingGroup = await seedUnit(tx, "working_group");
			await seedEricRelation(tx, activeWorkingGroup, "is_part_of", `${year - 3}-01-01`);
			const workingGroupUntilJune = await seedUnit(tx, "working_group");
			await seedEricRelation(
				tx,
				workingGroupUntilJune,
				"is_part_of",
				`${year - 3}-01-01`,
				`${year}-06-01`,
			);
			const endedWorkingGroup = await seedUnit(tx, "working_group");
			await seedEricRelation(
				tx,
				endedWorkingGroup,
				"is_part_of",
				`${year - 3}-01-01`,
				`${year - 1}-06-01`,
			);

			const readiness = await getReportingCampaignReadiness(draft);
			assert(readiness);

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");
			expect(await getStatus(tx, draft)).toBe("open");

			const countryReports = await getCountryReports(tx, draft);
			const reportedCountries = countryReports.map((report) => report.countryDocumentId);
			expect(reportedCountries).toEqual(
				expect.arrayContaining([member, observerUntilMarch, memberFromOctober]),
			);
			for (const ineligible of [
				memberUntilLastYear,
				memberFromNextYear,
				cooperatingPartner,
				unpublished,
			]) {
				expect(reportedCountries).not.toContain(ineligible);
			}
			expect(new Set(reportedCountries).size).toBe(countryReports.length);
			expect(countryReports).toHaveLength(readiness.countryCount);

			const workingGroupReports = await getWorkingGroupReports(tx, draft);
			const reportedWorkingGroups = workingGroupReports.map(
				(report) => report.workingGroupDocumentId,
			);
			expect(reportedWorkingGroups).toEqual(
				expect.arrayContaining([activeWorkingGroup, workingGroupUntilJune]),
			);
			expect(reportedWorkingGroups).not.toContain(endedWorkingGroup);
			expect(new Set(reportedWorkingGroups).size).toBe(workingGroupReports.length);
			expect(workingGroupReports).toHaveLength(readiness.workingGroupCount);

			expect(
				[...countryReports, ...workingGroupReports].every((report) => report.status === "draft"),
			).toBe(true);
		});
	});

	it("keeps the campaign a draft without reports when creating a report fails", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const draft = await seedCampaign(tx, "draft", year);
			await seedCampaignAmounts(tx, draft);

			const member = await seedUnit(tx, "country");
			await seedEricRelation(tx, member, "is_member_of", `${year - 3}-01-01`);
			const workingGroup = await seedUnit(tx, "working_group");
			await seedEricRelation(tx, workingGroup, "is_part_of", `${year - 3}-01-01`);
			// A report that already exists makes creating the launch's report for the same working group fail.
			await tx
				.insert(schema.workingGroupReports)
				.values({ campaignId: draft, workingGroupDocumentId: workingGroup });

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, draft)).toBe("draft");
			expect(await getCountryReports(tx, draft)).toHaveLength(0);
			expect(await getWorkingGroupReports(tx, draft)).toHaveLength(1);
		});
	});
});
