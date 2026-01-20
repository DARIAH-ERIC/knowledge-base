import { err, ok, type Result } from "@acdh-oeaw/lib";
import { createTransport, type SendMailOptions } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { env } from "@/config/env.config";
import { SmtpError } from "@/lib/server/errors";

interface SendEmailParams extends Pick<
	SendMailOptions,
	"attachments" | "from" | "html" | "subject" | "text" | "to"
> {}

export async function sendEmail(
	params: SendEmailParams,
): Promise<Result<SMTPTransport.SentMessageInfo, Error>> {
	const { attachments, from, html, subject, text, to } = params;

	const transporter = createTransport({
		auth:
			env.EMAIL_SMTP_USERNAME != null && env.EMAIL_SMTP_PASSWORD != null
				? {
						user: env.EMAIL_SMTP_USERNAME,
						pass: env.EMAIL_SMTP_PASSWORD,
					}
				: undefined,
		host: env.EMAIL_SMTP_SERVER,
		port: env.EMAIL_SMTP_PORT,
		secure: env.EMAIL_SSL_CONNECTION === "enabled",
	});

	try {
		const response = await transporter.sendMail({
			attachments,
			from,
			html,
			subject,
			text,
			to,
		});

		return ok(response);
	} catch (error) {
		return err(new SmtpError(undefined, error instanceof Error ? error : undefined));
	}
}
