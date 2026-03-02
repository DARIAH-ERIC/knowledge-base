import { cache } from "react";

import { auth } from "@/lib/auth";

export const getCurrentSession = cache(auth.getCurrentSession);
