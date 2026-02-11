import type { NextProxy, ProxyConfig } from "next/server";

import { middleware as i18nMiddleware } from "@/lib/i18n/middleware";
import { middleware as authMiddleware } from "@/lib/server/auth/middleware";
import { composeMiddleware } from "@/lib/server/compose-middlewares";
import { middleware as csrfMiddleware } from "@/lib/server/csrf/middleware";

export const proxy: NextProxy = composeMiddleware(csrfMiddleware, i18nMiddleware, authMiddleware);

export const config: ProxyConfig = {
	matcher: ["/", "/en/:path*", "/api/:path*"],
};
