import { createEmailService } from "@dariah-eric/email";

import { env } from "@/config/env.config";

export const email = createEmailService({
	config: {
		host: env.EMAIL_SMTP_SERVER,
		port: env.EMAIL_SMTP_PORT,
	},
});

/** The recipient of the contact form's messages and of the reporting notifications. */
export const reportingEmailAddress = env.REPORTING_EMAIL_ADDRESS;

/**
 * The sender of an email written by someone: their name as display name, but our own address, with
 * theirs as reply-to. A `from` address of a foreign domain would fail spf/dmarc checks at the
 * recipient's mail server, since the smtp server only sends for its own domains.
 */
export function sentOnBehalfOf(person: { email: string; name: string }): {
	from: { address: string; name: string };
	replyTo: { address: string; name: string };
} {
	return {
		from: { name: `${person.name} (via DARIAH knowledge base)`, address: env.EMAIL_ADDRESS },
		replyTo: { name: person.name, address: person.email },
	};
}
