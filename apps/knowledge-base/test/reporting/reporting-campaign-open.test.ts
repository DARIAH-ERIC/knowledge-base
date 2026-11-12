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
				visitsThreshold: serviceSize === "core" ? null : index * 100,
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

			expect(readiness?.missing.visitsThresholds).toEqual([
				"small",
				"medium",
				"large",
				"very_large",
			]);
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
