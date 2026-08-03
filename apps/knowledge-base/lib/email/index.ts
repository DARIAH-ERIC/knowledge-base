import { env } from "@/config/env.config";
import { createEmailService } from "@dariah-eric/email";

export const email = createEmailService({
	config: {
		host: env.EMAIL_SMTP_SERVER,
		port: env.EMAIL_SMTP_PORT,
	},
});
