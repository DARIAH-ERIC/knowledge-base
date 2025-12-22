import { object, number, pipe, string, optional, transform } from "valibot";

export const PaginationQuerySchema = object({
	page: optional(pipe(string(), transform(Number), number()), "1"),
	pageSize: optional(pipe(string(), transform(Number), number()), "20"),
});
