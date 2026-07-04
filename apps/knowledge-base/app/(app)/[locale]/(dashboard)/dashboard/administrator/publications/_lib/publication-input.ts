import type * as schema from "@dariah-eric/database/schema";

interface PublicationFormInput {
	title: string;
	type: schema.Publication["type"];
	status: schema.Publication["status"];
	publicationYear: number | "";
	publicationDate: Date | "";
	abstract: string;
	containerTitle: string;
	publisher: string;
	doi: string;
	url: string;
	creatorNames: string;
	keywordsText: string;
}

function nullable(value: string): string | null {
	const normalized = value.trim();
	return normalized === "" ? null : normalized;
}

export function normalizeDoi(value: string): string | null {
	const doi = value
		.trim()
		.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
		.replace(/^doi:\s*/i, "")
		.toLowerCase();
	return doi === "" ? null : doi;
}

export function toPublicationValues(input: PublicationFormInput): schema.PublicationInput {
	return {
		title: input.title.trim(),
		type: input.type,
		status: input.status,
		publicationYear: input.publicationYear === "" ? null : input.publicationYear,
		publicationDate: input.publicationDate === "" ? null : input.publicationDate,
		abstract: nullable(input.abstract),
		containerTitle: nullable(input.containerTitle),
		publisher: nullable(input.publisher),
		doi: normalizeDoi(input.doi),
		url: nullable(input.url),
		creators: input.creatorNames
			.split("\n")
			.map((name) => name.trim())
			.filter((name) => name !== "")
			.map((literal) => {
				return { literal };
			}),
		keywords: input.keywordsText
			.split(",")
			.map((keyword) => keyword.trim())
			.filter((keyword) => keyword !== ""),
	};
}
