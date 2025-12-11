import { createTransport, type SendMailOptions } from "nodemailer";

import { env } from "@/config/env.config";

interface SendEmailParams
	extends Pick<SendMailOptions, "attachments" | "from" | "html" | "subject" | "text" | "to"> {}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function sendEmail(params: SendEmailParams) {
	const { attachments, from, html, subject, text, to } = params;

	const transporter = createTransport({
		host: env.EMAIL_SMTP_SERVER,
		port: env.EMAIL_SMTP_PORT,
		secure: env.EMAIL_SSL_CONNECTION === "enabled",
		auth:
			env.EMAIL_SMTP_USERNAME != null && env.EMAIL_SMTP_PASSWORD != null
				? {
						user: env.EMAIL_SMTP_USERNAME,
						pass: env.EMAIL_SMTP_PASSWORD,
					}
				: undefined,
	});

	return transporter.sendMail({
		from,
		to,
		subject,
		text,
		html,
		attachments,
	});
}
