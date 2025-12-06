import type { ReactNode } from "react";

const dataAttribute = "uiColorScheme";
const localStorageKey = "ui-color-scheme";

export function ColorSchemeScript(): ReactNode {
	return (
		<script
			// eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
			dangerouslySetInnerHTML={{
				__html: `(${String(createColorSchemeScript)})("${dataAttribute}", "${localStorageKey}")`,
			}}
			id="color-scheme-script"
		/>
	);
}

export type ColorScheme = "dark" | "light";

export interface ColorSchemeState {
	kind: "system" | "user";
	colorScheme: ColorScheme;
}

declare global {
	interface Window {
		__colorScheme: {
			apply: () => void;
			get: () => ColorSchemeState;
			set: (colorScheme: ColorScheme | null) => void;
			subscribe: (listener: () => void) => () => void;
		};
	}
}

export function createColorSchemeScript(dataAttribute: string, storageKey: string): void {
	const mediaQueryList = matchMedia("(prefers-color-scheme: dark)");

	function getColorScheme(): ColorSchemeState {
		try {
			const colorScheme = localStorage.getItem(storageKey);

			if (colorScheme === "dark" || colorScheme === "light") {
				return { kind: "user", colorScheme };
			}
		} catch {
			/** noop */
		}

		const colorScheme = mediaQueryList.matches ? "dark" : "light";

		return { kind: "system", colorScheme };
	}

	function apply() {
		document.documentElement.dataset[dataAttribute] = state.colorScheme;
	}

	let state: ColorSchemeState = getColorScheme();

	apply();

	function get() {
		return state;
	}

	const listeners = new Set<() => void>();

	function subscribe(listener: () => void) {
		listeners.add(listener);

		return () => {
			listeners.delete(listener);
		};
	}

	function broadcast() {
		for (const listener of listeners) {
			listener();
		}
	}

	function disableTransitions() {
		const element = document.createElement("style");

		element.append(
			document.createTextNode("*, *::before, *::after { transition: none !important; }"),
		);

		document.head.append(element);

		return function enableTransitions() {
			window.requestAnimationFrame(() => {
				element.remove();
			});
		};
	}

	function update() {
		state = getColorScheme();
		const enableTransitions = disableTransitions();
		apply();
		enableTransitions();
	}

	window.addEventListener("storage", (event) => {
		if (event.key === storageKey && event.storageArea === window.localStorage) {
			update();
			broadcast();
		}
	});

	mediaQueryList.addEventListener("change", () => {
		update();
		broadcast();
	});

	function set(colorScheme: ColorScheme | null) {
		if (colorScheme == null) {
			localStorage.removeItem(storageKey);
		} else {
			localStorage.setItem(storageKey, colorScheme);
		}

		update();
		broadcast();
	}

	const store = {
		apply,
		get,
		set,
		subscribe,
	};

	window.__colorScheme = store;
}
