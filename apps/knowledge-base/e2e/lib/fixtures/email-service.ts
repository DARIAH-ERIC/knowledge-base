import { assert, createUrl } from "@acdh-oeaw/lib";
import type { APIRequestContext } from "@playwright/test";

import { env } from "@/config/env.config";

interface MailAddress {
	Address: string;
	Name?: string;
}

interface MailMessage {
	ID: string;
	From: MailAddress;
	To: Array<MailAddress>;
	Cc?: Array<MailAddress>;
	Bcc?: Array<MailAddress>;
	Subject: string;
	Created: string;
	Text: string;
}

interface MailpitListResponse {
	total: number;
	messages: Array<MailMessage>;
}

export interface EmailService {
	clear: () => Promise<void>;
	getMessages: () => Promise<MailpitListResponse>;
	getMessage: (id: string) => Promise<MailMessage>;
}

export function createEmailService(request: APIRequestContext): EmailService {
	const baseUrl = env.MAILPIT_API_BASE_URL;
	assert(baseUrl != null, "Email service not configured");

	return {
		async clear(): Promise<void> {
			const url = createUrl({
				baseUrl,
				pathname: "/api/v1/messages",
			});

			await request.delete(String(url));
		},
		async getMessages(): Promise<MailpitListResponse> {
			const url = createUrl({
				baseUrl,
				pathname: "/api/v1/messages",
			});

			const response = await request.get(String(url));
			const data = (await response.json()) as MailpitListResponse;

			return data;
		},
		async getMessage(id: string): Promise<MailMessage> {
			const url = createUrl({
				baseUrl,
				pathname: `/api/v1/message/${id}`,
			});

			const response = await request.get(String(url));
			const data = (await response.json()) as MailMessage;

			return data;
		},
	};
}
