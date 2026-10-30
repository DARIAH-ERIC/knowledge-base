import { type RefObject, useEffect, useEffectEvent, useState } from "react";

/**
 * Calls `onReset` with the value at mount when the form around `ref`'s element is reset, as
 * react-aria fields do. For fields which are no react-aria field, e.g. a controlled custom select
 * or a rich-text editor, so that they take part in a form's reset like any other field.
 */
export function useFormReset<T>(
	ref: RefObject<Element | null>,
	value: T,
	onReset: (initialValue: T) => void,
): void {
	// oxlint-disable-next-line react/hook-use-state -- initial value only, never updated.
	const [initialValue] = useState(value);

	const handleReset = useEffectEvent((event: Event) => {
		const element = ref.current;

		if (
			element != null &&
			event.target instanceof HTMLFormElement &&
			event.target.contains(element)
		) {
			onReset(initialValue);
		}
	});

	useEffect(() => {
		/**
		 * `reset` does not bubble, so it is caught while capturing. Listening on the document rather
		 * than the form also covers elements rendered only after mount, e.g. once an editor is ready.
		 */
		document.addEventListener("reset", handleReset, true);

		return () => {
			document.removeEventListener("reset", handleReset, true);
		};
	}, []);
}
