import { object, number, pipe, string, optional, transform } from "valibot";

export const PaginationQuerySchema = object({
	offset: optional(pipe(string(), transform(Number), number()), "1"),
	limit: optional(pipe(string(), transform(Number), number()), "20"),
});
