import { createUrl, createUrlSearchParams } from "@acdh-oeaw/lib";

import { request } from "@dariah-eric/request";

import type { CreateListMemberResponse, GetCampaignsResponse } from "./types";

export interface CreateMailchimpClientParams {
	config: {
		apiKey: string;
		baseUrl: string;
		listId: string;
	};
}

export interface ListCampaignsParams {
	count?: number;
	offset?: number;
	status?: string;
	beforeSendTime?: string;
	sinceSendTime?: string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function createMailchimpClient(params: CreateMailchimpClientParams) {
	const { config } = params;

	const { apiKey, baseUrl, listId } = config;

	const credentials = `key:${apiKey}`;

	const headers = {
		Authorization: `Basic ${Buffer.from(credentials, "utf-8").toString("base64")}`,
	};

	const client = {
		async get(params?: ListCampaignsParams) {
			const url = createUrl({
				baseUrl,
				pathname: "/3.0/campaigns",
				searchParams: createUrlSearchParams({
					count: params?.count ?? 10,

					offset: params?.offset ?? 0,
					list_id: listId,
					sort_dir: "DESC",
					/**
					 * Mailchimp does not order campaigns correctly by `sort_field=send_time` when the results
					 * are also filtered by `list_id` (which we always do). Since campaigns are created in the
					 * same order they are sent, we sort by `create_time` instead, which Mailchimp orders
					 * correctly and which matches send time order.
					 */
					sort_field: "create_time",
					status: params?.status,
					before_send_time: params?.beforeSendTime,
					since_send_time: params?.sinceSendTime,
				}),
			});

			/** @see {@link https://mailchimp.com/developer/marketing/api/campaigns/list-campaigns/} */
			const result = await request<GetCampaignsResponse>(url, {
				headers,
				responseType: "json",
			});

			return result;
		},

		async subscribe({ email }: { email: string }) {
			const url = createUrl({
				baseUrl,
				pathname: `/3.0/lists/${listId}/members`,
				searchParams: createUrlSearchParams({
					/**
					 * Currently `FNAME` and `LNAME` custom `merge_fields` are still required in `mailchimp`
					 * settings, but the subscription forms only provide `email`.
					 */
					skip_merge_validation: true,
				}),
			});

			const data = {
				email_address: email,
				status: "pending",
				/** @see {@link https://mailchimp.com/developer/marketing/docs/merge-fields/} */
				merge_fields: {},
			};

			/** @see {@link https://mailchimp.com/developer/marketing/api/list-members/add-member-to-list/} */
			const result = await request<CreateListMemberResponse>(url, {
				body: data,
				headers,
				method: "post",
				responseType: "json",
			});

			return result;
		},
	};

	return client;
}

export type MailChimpClient = ReturnType<typeof createMailchimpClient>;
