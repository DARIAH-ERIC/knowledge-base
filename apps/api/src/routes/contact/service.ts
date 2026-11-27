import { STATUS_CODES } from "node:http";

import { HTTPException } from "hono/http-exception";

import type { Logger } from "@/middlewares/logger";
import { type SendContactMessageRequest, contactTopics } from "@/routes/contact/schemas";
import { email as emailService } from "@/services/email";
import { env } from "~/config/env.config";

interface SendContactMessageParams extends SendContactMessageRequest {
	logger?: Pick<Logger, "error">;
}

/**
 * The sender's address goes into `reply-to`, never into `from`: the smtp server only sends for its
 * own domains, and a `from` address of a foreign domain would fail spf/dmarc checks at the
 * recipient's mail server - and look like spoofing. The sender's name is the display name of `from`
 * instead, so that the inbox lists the message by who wrote it, and replying answers them.
 *
 * The message itself is never logged, since it may contain personal data.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function sendContactMessage(params: SendContactMessageParams) {
	const { email, logger, message, name, subject, topic } = params;

	if (emailService == null || env.EMAIL_ADDRESS == null || env.CONTACT_EMAIL_ADDRESS == null) {
		logger?.error("Contact form email is not configured");

		throw new HTTPException(503, { message: STATUS_CODES[503] });
	}

	const result = await emailService.sendEmail({
		from: { name: `${name} (via DARIAH website)`, address: env.EMAIL_ADDRESS },
		to: env.CONTACT_EMAIL_ADDRESS,
		replyTo: { name, address: email },
		subject: `[DARIAH helpdesk] ${contactTopics[topic]}: ${subject}`,
		text: [`From: ${name} <${email}>`, `Topic: ${contactTopics[topic]}`, "", message].join("\n"),
	});

	if (result.isErr()) {
		logger?.error({ err: result.error }, "Sending contact form email failed");

		throw new HTTPException(500, { cause: result.error, message: STATUS_CODES[500] });
	}

	return { message: "Message sent" };
}
