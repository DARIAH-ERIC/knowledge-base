"use client";

import { createContext, type FC } from "react";

export interface UiContextValue {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	LinkComponent?: FC<any>;
}

export const UiContext = createContext<UiContextValue>({});

export { UiContext as UiProvider };
