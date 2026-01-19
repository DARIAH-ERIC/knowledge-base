import { headers } from "next/headers";

import { RefillingTokenBucket } from "@/lib/server/rate-limit/rate-limiter";

export const globalBucket = new RefillingTokenBucket<string>(100, 1);

export async function globalGETRateLimit(): Promise<boolean> {
	const headersList = await headers();

	/**
	 * Assumes `x-forwarded-for` header will always be defined.
	 *
	 * In acdh-ch infrastructure, `x-forwarded-for` actually holds the ip of the nginx ingress.
	 * Ask a sysadmin to enable "proxy-protocol" in haproxy to receive actual ip addresses.
	 */
	const clientIP = headersList.get("x-forwarded-for");

	if (clientIP == null) {
		return true;
	}

	return globalBucket.consume(clientIP, 1);
}

export async function globalPOSTRateLimit(): Promise<boolean> {
	const headersList = await headers();

	/**
	 * Assumes `x-forwarded-for` header will always be defined.
	 *
	 * In acdh-ch infrastructure, `x-forwarded-for` actually holds the ip of the nginx ingress.
	 * Ask a sysadmin to enable "proxy-protocol" in haproxy to receive actual ip addresses.
	 */
	const clientIP = headersList.get("x-forwarded-for");

	if (clientIP == null) {
		return true;
	}

	return globalBucket.consume(clientIP, 3);
}
