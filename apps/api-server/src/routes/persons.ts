import { Hono } from "hono";
import { EventSelectSchema } from "@dariah-eric/dariah-knowledge-base-database-client/schema";
import { array, omit } from "valibot";

export const personsRoute = new Hono();

export const PersonsResponseSchema = array(
	omit(EventSelectSchema, ["createdAt", "deletedAt", "updatedAt"]),
);
