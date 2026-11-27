import * as v from "valibot";

/** Strips line breaks, which have no place in a single-line field, and would end up in a header. */
function singleLine(value: string): string {
	return value.replaceAll(/[\r\n]+/g, " ");
}

/**
 * The topics of the old website's helpdesk form, by which the dariah office sorts incoming
 * messages.
 */
export const contactTopics = {
	"education-and-training": "Education and training",
	general: "General",
	"join-dariah": "Join DARIAH",
	"open-science": "Open Science",
	projects: "Projects",
	"technical-issues": "Technical issues",
	"tools-and-services": "Tools and Services",
	"working-groups": "Working Groups",
} as const;

export type ContactTopic = keyof typeof contactTopics;

export const SendContactMessageRequestSchema = v.pipe(
	v.object({
		name: v.pipe(
			v.string(),
			v.transform(singleLine),
			v.trim(),
			v.nonEmpty(),
			v.maxLength(200),
			v.description("Name of the sender"),
		),
		email: v.pipe(
			v.string(),
			v.trim(),
			v.email(),
			v.maxLength(254),
			v.description("Email address of the sender, used as reply-to address"),
		),
		topic: v.pipe(
			v.picklist(Object.keys(contactTopics) as Array<ContactTopic>),
			v.description("Topic of the message"),
		),
		subject: v.pipe(
			v.string(),
			v.transform(singleLine),
			v.trim(),
			v.nonEmpty(),
			v.maxLength(200),
			v.description("Subject of the message"),
		),
		message: v.pipe(
			v.string(),
			v.trim(),
			v.nonEmpty(),
			v.maxLength(10_000),
			v.description("Message text"),
		),
	}),
	v.description("Contact form message"),
	v.metadata({ ref: "SendContactMessageRequest" }),
);

export type SendContactMessageRequest = v.InferOutput<typeof SendContactMessageRequestSchema>;

export const SendContactMessageResponseSchema = v.pipe(
	v.object({
		message: v.string(),
	}),
	v.description("Contact form message sent"),
	v.metadata({ ref: "SendContactMessageResponse" }),
);

export type SendContactMessageResponse = v.InferOutput<typeof SendContactMessageResponseSchema>;

export const SendContactMessage = {
	RequestSchema: SendContactMessageRequestSchema,
	ResponseSchema: SendContactMessageResponseSchema,
};
