import { RefillingTokenBucket } from "@dariah-eric/rate-limiter";
import { headers } from "next/headers";

export const globalBucket = new RefillingTokenBucket<string>(100, 1);

export async function globalGetRequestRateLimit(): Promise<boolean> {
	const list = await headers();
	const ip = list.get("x-forwarded-for");

	if (ip == null) {
		return true;
	}

	return globalBucket.consume(ip, 1);
}

export async function globalPostRequestRateLimit(): Promise<boolean> {
	const list = await headers();
	const ip = list.get("x-forwarded-for");

	if (ip == null) {
		return true;
	}

	return globalBucket.consume(ip, 3);
}
