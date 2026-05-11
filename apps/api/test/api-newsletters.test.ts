import { HttpError } from "@dariah-eric/request/errors";
import { Result } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTestClient } from "~/test/lib/create-test-client";

const { mailchimp } = vi.hoisted(() => {
	return {
		mailchimp: {
			get: vi.fn(),
			subscribe: vi.fn(),
		},
	};
});

vi.mock("@/services/mailchimp", () => {
	return { mailchimp };
});

describe("newsletters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST /api/newsletters/subscribe", () => {
		it("should subscribe an email address", async () => {
			mailchimp.subscribe.mockResolvedValue(
				Result.ok({
					data: {
						email_address: "test@example.com",
					},
					headers: new Headers(),
				}),
			);

			const client = createTestClient(undefined as never);

			const response = await client.newsletters.subscribe.$post({
				json: {
					email: "test@example.com",
				},
			});

			expect(response.status).toBe(201);
			expect(mailchimp.subscribe).toHaveBeenCalledWith({ email: "test@example.com" });
			await expect(response.json()).resolves.toEqual({
				email: "test@example.com",
			});
		});

		it("should reject invalid email addresses", async () => {
			const client = createTestClient(undefined as never);

			const response = await client.newsletters.subscribe.$post({
				json: {
					email: "invalid-email",
				},
			});

			expect(response.status).toBe(400);
			expect(mailchimp.subscribe).not.toHaveBeenCalled();
		});

		it("should return a specific message when the email is already subscribed", async () => {
			mailchimp.subscribe.mockResolvedValue(
				Result.err(
					new HttpError({
						request: new Request("https://example.com"),
						response: Response.json(
							{ title: "Member Exists" },
							{
								status: 400,
								headers: { "content-type": "application/json" },
							},
						),
					}),
				),
			);

			const client = createTestClient(undefined as never);

			const response = await client.newsletters.subscribe.$post({
				json: {
					email: "test@example.com",
				},
			});

			expect(response.status).toBe(400);
			await expect(response.json()).resolves.toEqual({
				message: "Already subscribed",
			});
		});
	});
});
