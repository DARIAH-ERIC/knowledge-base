import { randomBytes, randomUUID } from "node:crypto";

import { assert } from "@acdh-oeaw/lib";
import type { User } from "@dariah-eric/auth";
import * as schema from "@dariah-eric/database/schema";
import { createActionStateInitial } from "@dariah-eric/next-lib/actions";
import { describe, expect, it, vi } from "vitest";

import type * as DbModule from "@/lib/db";
import type { Transaction } from "@/lib/db";
import { eq } from "@/lib/db/sql";
import { withTransaction } from "@/test/lib/with-transaction";

/**
 * Reporting campaigns are annual, so at most one is open at a time. The launch, create and update
 * actions each refuse to open a second one.
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

			const state = await launchReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: draft }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, draft)).toBe("draft");
		});
	});

	it("refuses to create an open campaign while another one is open, but not a draft", async () => {
		await withAdminTransaction(async (tx) => {
			await seedCampaign(tx, "open");
			const openYear = unusedYear();
			const draftYear = openYear + 1;

			const refused = await createReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ year: String(openYear), status: "open" }),
			);
			expect(refused.status).toBe("error");
			expect(
				await tx.query.reportingCampaigns.findFirst({ where: { year: openYear } }),
			).toBeUndefined();

			const created = await createReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ year: String(draftYear), status: "draft" }),
			);
			expect(created.status, JSON.stringify(created)).toBe("success");
		});
	});

	it("refuses to set a campaign to open while another one is open", async () => {
		await withAdminTransaction(async (tx) => {
			await seedCampaign(tx, "open");
			const year = unusedYear();
			const closed = await seedCampaign(tx, "closed", year);

			const state = await updateReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: closed, year: String(year), status: "open" }),
			);
			expect(state.status).toBe("error");
			expect(await getStatus(tx, closed)).toBe("closed");
		});
	});

	it("lets the open campaign itself be saved while it stays open", async () => {
		await withAdminTransaction(async (tx) => {
			const year = unusedYear();
			const open = await seedCampaign(tx, "open", year);

			const state = await updateReportingCampaignAction(
				createActionStateInitial(),
				toFormData({ id: open, year: String(year + 1), status: "open" }),
			);
			expect(state.status, JSON.stringify(state)).toBe("success");
			expect(await getStatus(tx, open)).toBe("open");
		});
	});
});
