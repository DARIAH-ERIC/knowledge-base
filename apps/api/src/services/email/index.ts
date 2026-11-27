import { type EmailService, createEmailService } from "@dariah-eric/email";

import { env } from "~/config/env.config";

/**
 * `null` when no smtp server is configured, so that a deployment without email settings still
 * serves every other route - only the routes which send email answer with an error.
 */
function createEmail(): EmailService | null {
	if (env.EMAIL_SMTP_SERVER == null || env.EMAIL_SMTP_PORT == null) {
		return null;
	}

	return createEmailService({
		config: {
			auth:
				env.EMAIL_SMTP_USERNAME != null && env.EMAIL_SMTP_PASSWORD != null
					? { user: env.EMAIL_SMTP_USERNAME, pass: env.EMAIL_SMTP_PASSWORD }
					: undefined,
			host: env.EMAIL_SMTP_SERVER,
			port: env.EMAIL_SMTP_PORT,
			secure: env.EMAIL_SSL_CONNECTION === "enabled",
		},
	});
}

export const email = createEmail();
