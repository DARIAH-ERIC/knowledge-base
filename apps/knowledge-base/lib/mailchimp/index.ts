import {
	type CreateListMemberResponse,
	createMailchimpClient,
	type GetCampaignsResponse,
} from "@dariah-eric/mailchimp";

import { env } from "@/config/env.config";

export const mailchimp = createMailchimpClient({
	config: {
		apiKey: env.MAILCHIMP_API_KEY,
		baseUrl: env.MAILCHIMP_API_BASE_URL,
		listId: env.MAILCHIMP_LIST_ID,
	},
});

export type { CreateListMemberResponse, GetCampaignsResponse };
