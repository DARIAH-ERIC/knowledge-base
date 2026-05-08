import { STATUS_CODES } from "node:http";

import { HttpError } from "@dariah-eric/request/errors";
import { HTTPException } from "hono/http-exception";

import { mailchimp } from "@/services/mailchimp";
import type { ContentfulStatusCode } from "hono/utils/http-status";

interface MailchimpErrorResponse {
	title?: string;
}

interface GetNewslettersParams {
	/** @default 10 */
	limit?: number;
	/** @default 0 */
	offset?: number;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function getNewsletters(params: GetNewslettersParams) {
	const { limit = 10, offset = 0 } = params;

	const result = (await mailchimp.get({ count: limit, offset })).unwrap().data;

	const total = result.total_items;
	const data = result.campaigns.map((campaign) => {
		return {
			id: campaign.id,
			subject_line: campaign.settings.subject_line,
			send_time: campaign.send_time || null,
			archive_url: campaign.archive_url,
			status: campaign.status,
		};
	});

	return { data, limit, offset, total };
}

interface SubscribeToNewsletterParams {
	email: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function subscribeToNewsletter(params: SubscribeToNewsletterParams) {
	const { email } = params;

	try {
		const { email_address } = (await mailchimp.subscribe({ email })).unwrap().data;

		return { email: email_address };
	} catch (error) {
		if (HttpError.is(error)) {
			const status = error.response.status;
			let message = STATUS_CODES[status] ?? STATUS_CODES[500];

			if (status === 400) {
				try {
					const data = (await error.response.json()) as MailchimpErrorResponse;

					if (data.title === "Member Exists") {
						message = "Already subscribed";
					}
				} catch {
					/** noop */
				}
			}

			throw new HTTPException(status as ContentfulStatusCode, {
				cause: error,
				message,
			});
		}

		throw new HTTPException(500, {
			cause: error,
			message: STATUS_CODES[500],
		});
	}
}
