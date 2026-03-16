import { mailchimp } from "@/services/mailchimp";

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
