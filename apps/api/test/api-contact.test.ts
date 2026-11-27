import { Result } from "better-result";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as EnvConfig from "~/config/env.config";
import { env } from "~/config/env.config";
import { createTestClient } from "~/test/lib/create-test-client";

const { email } = vi.hoisted(() => {
	return {
		email: {
			sendEmail: vi.fn(),
		},
	};
});

vi.mock("@/services/email", () => {
	return { email };
});

vi.mock("~/config/env.config", async (importOriginal) => {
	const { env } = await importOriginal<typeof EnvConfig>();

	return {
		env: {
			...env,
			CONTACT_EMAIL_ADDRESS: "info@example.com",
			EMAIL_ADDRESS: "noreply@example.com",
		},
	};
});

describe("contact", () => {
	const headers = { "x-api-access-token": env.API_ACCESS_TOKEN ?? "" };

	const input = {
		name: "Firstname Lastname",
		email: "user@example.com",
		topic: "join-dariah" as const,
		subject: "Question",
		message: "Hello,\n\nI have a question.",
	};

	let clientIpCounter = 0;

	/** Every test is a different visitor, so the rate limit does not carry over between tests. */
	function createHeaders(): Record<string, string> {
		clientIpCounter += 1;
		return { ...headers, "x-client-ip": `192.0.2.${String(clientIpCounter)}` };
	}

	beforeEach(() => {
		vi.clearAllMocks();
		email.sendEmail.mockResolvedValue(Result.ok({ messageId: "message-id" }));
	});

	describe("POST /api/contact", () => {
		it("should require the api access token header", async () => {
			const client = createTestClient(undefined as never);

			const response = await client.contact.$post({ json: input });

			expect(response.status).toBe(401);
			expect(email.sendEmail).not.toHaveBeenCalled();
		});

		it("should send the message to the contact address, with the sender as reply-to", async () => {
			const client = createTestClient(undefined as never);

			const response = await client.contact.$post({ json: input }, { headers: createHeaders() });

			expect(response.status).toBe(200);
			await expect(response.json()).resolves.toEqual({ message: "Message sent" });
			expect(email.sendEmail).toHaveBeenCalledWith({
				from: { name: "Firstname Lastname (via DARIAH website)", address: "noreply@example.com" },
				to: "info@example.com",
				replyTo: { name: "Firstname Lastname", address: "user@example.com" },
				subject: "[DARIAH helpdesk] Join DARIAH: Question",
				text: "From: Firstname Lastname <user@example.com>\nTopic: Join DARIAH\n\nHello,\n\nI have a question.",
			});
		});

		it("should strip line breaks from single-line fields", async () => {
			const client = createTestClient(undefined as never);

			const response = await client.contact.$post(
				{
					json: {
						...input,
						name: "Firstname\r\nLastname",
						subject: "Question\nBcc: x@example.com",
					},
				},
				{ headers: createHeaders() },
			);

			expect(response.status).toBe(200);
			expect(email.sendEmail).toHaveBeenCalledWith(
				expect.objectContaining({
					replyTo: { name: "Firstname Lastname", address: "user@example.com" },
					subject: "[DARIAH helpdesk] Join DARIAH: Question Bcc: x@example.com",
				}),
			);
		});

		it("should reject invalid input", async () => {
			const client = createTestClient(undefined as never);

			const response = await client.contact.$post(
				{ json: { ...input, email: "invalid-email", message: "  " } },
				{ headers: createHeaders() },
			);

			expect(response.status).toBe(400);
			expect(email.sendEmail).not.toHaveBeenCalled();
		});

		it("should reject unknown topics", async () => {
			const client = createTestClient(undefined as never);

			const response = await client.contact.$post(
				{ json: { ...input, topic: "unknown" as never } },
				{ headers: createHeaders() },
			);

			expect(response.status).toBe(400);
			expect(email.sendEmail).not.toHaveBeenCalled();
		});

		it("should answer with an error when sending fails", async () => {
			email.sendEmail.mockResolvedValue(Result.err(new Error("Connection refused")));

			const client = createTestClient(undefined as never);

			const response = await client.contact.$post({ json: input }, { headers: createHeaders() });

			expect(response.status).toBe(500);
		});

		it("should rate limit by the forwarded client ip", async () => {
			const client = createTestClient(undefined as never);

			const visitor = createHeaders();

			for (let i = 0; i < 5; i++) {
				const response = await client.contact.$post({ json: input }, { headers: visitor });
				expect(response.status).toBe(200);
			}

			const limited = await client.contact.$post({ json: input }, { headers: visitor });
			expect(limited.status).toBe(429);

			const other = await client.contact.$post({ json: input }, { headers: createHeaders() });
			expect(other.status).toBe(200);
		});
	});
});
