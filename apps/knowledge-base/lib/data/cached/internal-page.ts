import { cache } from "react";

import { findPublishedInternalPageContent as _findPublishedInternalPageContent } from "@/lib/data/internal-page";

export const findPublishedInternalPageContent = cache(_findPublishedInternalPageContent);
