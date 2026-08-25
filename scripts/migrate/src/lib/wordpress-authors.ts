import { toPlaintext } from "./migrate-wordpress-content";

/**
 * WordPress had no author field for spotlight articles and impact case studies — the byline is part
 * of the article body, written as "Written by …" / "By …" near the top. This reads that byline back
 * out so contributors can be modelled as relations to person entities.
 *
 * The heuristics are deliberately conservative: only the first lines of the article are considered,
 * a candidate has to look like a person's name, and anything reading as an affiliation is dropped —
 * a missed author is a blank to be filled in by an editor, a wrong one is data to be found and
 * removed.
 */
export function extractAuthorsFromHtml(html: string): Array<string> {
	const lines = toPlaintext(html)
		.split(/\r?\n+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.slice(0, 20);

	const affiliations = [
		"university",
		"college",
		"institute",
		"institut",
		"dariah",
		"clariah",
		"professor",
		"assistant",
		"associate",
		"scientific",
		"lecturer",
		"research",
		"department",
		"school",
		"faculty",
		"centre",
		"center",
		"library",
		"museum",
		"archive",
		"editor",
		"editors",
		"course editors",
		"one of the course editors",
		"followed by",
	];

	const isLikelyName = (value: string): boolean => {
		const parts = value.trim().split(/\s+/);

		if (parts.length < 2 || parts.length > 5) {
			return false;
		}

		return parts.every((part, index) => {
			if (/^[A-Z]\.$/u.test(part)) {
				return true;
			}

			if (index > 0 && /^(?:de|del|van|von|da|di|du|la|le|der|den)$/i.test(part)) {
				return true;
			}

			return /^[A-Z][\p{L}'’.-]*$/u.test(part);
		});
	};

	const cleanCandidate = (value: string): Array<string> => {
		let candidate = value.trim().replaceAll(/\s+/g, " ");

		if (candidate.length === 0) {
			return [];
		}

		candidate = candidate.replace(/\s*\([^)]*\)\s*$/, "");
		candidate = candidate.replace(/\s*\[[^\]]*\]\s*$/, "");
		candidate = candidate.split(",")[0] ?? candidate;
		candidate = candidate.split(" - ")[0] ?? candidate;
		candidate = candidate.split(" – ")[0] ?? candidate;
		candidate = candidate.split(" — ")[0] ?? candidate;
		candidate = candidate.trim();

		if (candidate.length === 0) {
			return [];
		}

		const pieces = candidate.split(/[,;/&]|\sand\s/i);

		return pieces
			.map((piece) => piece.trim())
			.filter((piece) => piece.length > 0)
			.filter((piece) => {
				const lower = piece.toLowerCase();

				if (affiliations.some((marker) => lower.includes(marker))) {
					return false;
				}

				return isLikelyName(piece);
			});
	};

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index]!;
		const bylineMatch = /^(?:written by|lead author|by)\s*:?\s*/i.exec(line);

		if (bylineMatch != null) {
			const authors = cleanCandidate(line.slice(bylineMatch[0].length));

			if (authors.length > 0) {
				return authors;
			}

			const continuation = lines.slice(index + 1, index + 4).join(" ");
			const continuationAuthors = cleanCandidate(continuation);

			if (continuationAuthors.length > 0) {
				return continuationAuthors;
			}
		}
	}

	return [];
}
