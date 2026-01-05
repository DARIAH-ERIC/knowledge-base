import { cache } from "react";

import { getAssets as _getAssets } from "@/lib/data/assets";

export const getAssets = cache(_getAssets);
