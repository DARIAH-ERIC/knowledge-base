import { createUrl, createUrlSearchParams, request } from "@acdh-oeaw/lib";

import { env } from "@/config/env.config";

interface GetCampaignsResponse {
	campaigns: [
		{
			id: string;
			web_id: number;
			parent_campaign_id: string;
			type: string;
			create_time: string;
			archive_url: string;
			long_archive_url: string;
			status: string;
			emails_sent: number;
			send_time: string;
			content_type: string;
			needs_block_refresh: boolean;
			resendable: boolean;
			recipients: {
				list_id: string;
				list_is_active: boolean;
				list_name: string;
				segment_text: string;
				recipient_count: number;
				segment_opts: {
					saved_segment_id: number;
					prebuilt_segment_id: string;
					match: string;
					conditions: [null];
				};
			};
			settings: {
				subject_line: string;
				preview_text: string;
				title: string;
				from_name: string;
				reply_to: string;
				use_conversation: boolean;
				to_name: string;
				folder_id: string;
				authenticate: boolean;
				auto_footer: boolean;
				inline_css: boolean;
				auto_tweet: boolean;
				auto_fb_post: [string];
				fb_comments: boolean;
				timewarp: boolean;
				template_id: number;
				drag_and_drop: boolean;
			};
			variate_settings: {
				winning_combination_id: string;
				winning_campaign_id: string;
				winner_criteria: string;
				wait_time: number;
				test_size: number;
				subject_lines: [string];
				send_times: [string];
				from_names: [string];
				reply_to_addresses: [string];
				contents: [string];
				combinations: [
					{
						id: string;
						subject_line: number;
						send_time: number;
						from_name: number;
						reply_to: number;
						content_description: number;
						recipients: number;
					},
				];
			};
			tracking: {
				opens: boolean;
				html_clicks: boolean;
				text_clicks: boolean;
				goal_tracking: boolean;
				ecomm36number: boolean;
				google_analytics: string;
				clicktale: string;
				salesforce: {
					campaign: boolean;
					notes: boolean;
				};
				capsule: {
					notes: boolean;
				};
			};
			rss_opts: {
				feed_url: string;
				frequency: string;
				schedule: {
					hour: number;
					daily_send: {
						sunday: boolean;
						monday: boolean;
						tuesday: boolean;
						wednesday: boolean;
						thursday: boolean;
						friday: boolean;
						saturday: boolean;
					};
					weekly_send_day: string;
					monthly_send_date: number;
				};
				last_sent: string;
				constrain_rss_img: boolean;
			};
			ab_split_opts: {
				split_test: string;
				pick_winner: string;
				wait_units: string;
				wait_time: number;
				split_size: number;
				from_name_a: string;
				from_name_b: string;
				reply_email_a: string;
				reply_email_b: string;
				subject_a: string;
				subject_b: string;
				send_time_a: string;
				send_time_b: string;
				send_time_winner: string;
			};
			social_card: {
				image_url: string;
				description: string;
				title: string;
			};
			report_summary: {
				opens: number;
				unique_opens: number;
				open_rate: number;
				clicks: number;
				subscriber_clicks: number;
				click_rate: number;
				ecommerce: {
					total_orders: number;
					total_spent: number;
					total_revenue: number;
				};
			};
			delivery_status: {
				enabled: boolean;
				can_cancel: boolean;
				status: string;
				emails_sent: number;
				emails_canceled: number;
			};
			resend_shortcut_eligibility: {
				to_non_openers: {
					is_eligible: boolean;
					reason: string;
				};
				to_new_subscribers: {
					is_eligible: boolean;
					reason: string;
				};
				to_non_clickers: {
					is_eligible: boolean;
					reason: string;
				};
				to_non_purchasers: {
					is_eligible: boolean;
					reason: string;
				};
			};
			resend_shortcut_usage: {
				shortcut_campaigns: [
					{
						id: string;
						web_id: number;
						shortcut_type: string;
						send_time: string;
						status: string;
					},
				];
				original_campaign: {
					id: string;
					web_id: number;
					title: string;
					shortcut_type: string;
				};
			};
			_links: [
				{
					rel: string;
					href: string;
					method: string;
					targetSchema: string;
					schema: string;
				},
			];
		},
	];
	total_items: number;
	_links: [
		{
			rel: string;
			href: string;
			method: string;
			targetSchema: string;
			schema: string;
		},
	];
}

interface CreateListMemberResponse {
	id: string;
	email_address: string;
	unique_email_id: string;
	contact_id: string;
	full_name: string;
	web_id: number;
	email_type: string;
	status: "subscribed" | "unsubscribed" | "cleaned" | "pending" | "transactional" | "archived";
	unsubscribe_reason: string;
	consents_to_one_to_one_messaging: boolean;
	sms_phone_number: string;
	sms_subscription_status: "subscribed" | "unsubscribed" | "nonsubscribed" | "pending";
	sms_subscription_last_updated: string;
	merge_fields: {
		property1: null;
		property2: null;
	};
	interests: {
		property1: boolean;
		property2: boolean;
	};
	stats: {
		avg_open_rate: number;
		avg_click_rate: number;
		ecommerce_data: {
			total_revenue: number;
			number_of_orders: number;
			currency_code: string;
		};
	};
	ip_signup: string;
	timestamp_signup: string;
	ip_opt: string;
	timestamp_opt: string;
	member_rating: number;
	last_changed: string;
	language: string;
	vip: boolean;
	email_client: string;
	location: {
		latitude: number;
		longitude: number;
		gmtoff: number;
		dstoff: number;
		country_code: string;
		timezone: string;
		region: string;
	};
	marketing_permissions: [
		{
			marketing_permission_id: string;
			text: string;
			enabled: boolean;
		},
	];
	last_note: {
		note_id: number;
		created_at: string;
		created_by: string;
		note: string;
	};
	source: string;
	tags_count: number;
	tags: [
		{
			id: number;
			name: string;
		},
	];
	list_id: string;
	_links: [
		{
			rel: string;
			href: string;
			method: string;
			targetSchema: string;
			schema: string;
		},
	];
}

function createClient() {
	const baseUrl = env.MAILCHIMP_API_BASE_URL;

	const credentials = `key:${env.MAILCHIMP_API_KEY}`;

	const headers = {
		Authorization: `Basic ${Buffer.from(credentials, "utf-8").toString("base64")}`,
	};

	const client = {
		async get() {
			const url = createUrl({
				baseUrl,
				pathname: "/3.0/campaigns",
				searchParams: createUrlSearchParams({
					count: 1000,
					list_id: env.MAILCHIMP_LIST_ID,
					sort_dir: "DESC",
					sort_field: "send_time",
				}),
			});

			/** @see {@link https://mailchimp.com/developer/marketing/api/campaigns/list-campaigns/} */
			const result = await request<GetCampaignsResponse>(url, {
				headers,
				responseType: "json",
			});

			return result;
		},
		async subscribe({
			email,
			firstName,
			lastName,
			institution,
		}: {
			email: string;
			firstName: string;
			lastName: string;
			institution?: string;
		}) {
			const url = createUrl({
				baseUrl,
				pathname: `/3.0/lists/${env.MAILCHIMP_LIST_ID}/members`,
				searchParams: createUrlSearchParams({
					// FIXME: currently FNAME and LNAME are required but not in the mockups
					skip_merge_validation: true,
				}),
			});

			const data = {
				email_address: email,
				status: "pending",
				/** @see {@link https://mailchimp.com/developer/marketing/docs/merge-fields/} */
				merge_fields: {
					FNAME: firstName,
					LNAME: lastName,
					MMERGE3: institution,
				},
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

export const client = createClient();
