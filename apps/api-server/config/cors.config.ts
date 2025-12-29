import type { cors } from "hono/cors";

type CORSOptions = Parameters<typeof cors>[0];

export const config: CORSOptions = {
	allowMethods: ["GET"],
	origin: [
		"http://localhost:3002",
		"https://dariah.eu",
		"https://www.dariah.eu",
		"https://dariah-website-beta.vercel.app",
	],
};
