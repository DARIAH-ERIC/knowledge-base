import { object, pipe, string } from "valibot";

export const PathParamsSchema = object({
	id: pipe(string()),
});
