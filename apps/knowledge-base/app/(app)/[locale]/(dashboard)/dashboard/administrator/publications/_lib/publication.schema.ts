import * as schema from "@dariah-eric/database/schema";
import * as v from "valibot";

const optionalText = v.optional(v.string(), "");
const optionalUrl = v.optional(v.union([v.literal(""), v.pipe(v.string(), v.url())]), "");
const optionalYear = v.optional(
	v.union([
		v.literal(""),
		v.pipe(v.string(), v.transform(Number), v.integer(), v.minValue(1000), v.maxValue(9999)),
	]),
	"",
);
const optionalDate = v.optional(
	v.union([v.literal(""), v.pipe(v.string(), v.isoDate(), v.toDate())]),
	"",
);

export const PublicationFieldsSchema = v.object({
	title: v.pipe(v.string(), v.nonEmpty()),
	type: v.picklist(schema.publicationTypesEnum),
	status: v.picklist(schema.publicationStatusEnum),
	publicationYear: optionalYear,
	publicationDate: optionalDate,
	abstract: optionalText,
	containerTitle: optionalText,
	publisher: optionalText,
	doi: optionalText,
	url: optionalUrl,
	creatorNames: optionalText,
	keywordsText: optionalText,
	nationalConsortiumDocumentIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
	workingGroupDocumentIds: v.optional(v.array(v.pipe(v.string(), v.uuid())), []),
});

export const CreatePublicationActionInputSchema = PublicationFieldsSchema;

export const UpdatePublicationActionInputSchema = v.object({
	...PublicationFieldsSchema.entries,
	id: v.pipe(v.string(), v.uuid()),
});
