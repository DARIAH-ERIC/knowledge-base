import type { Locator } from "@playwright/test";

export interface DroppedFile {
	name: string;
	mimeType: string;
	buffer: Buffer;
}

/**
 * Drops `file` onto the drop zone labelled `label` inside `container`.
 *
 * Playwright cannot drag a file in from outside the page, so this dispatches the native drag events
 * a browser would fire, carrying a `DataTransfer` built in the page. They are dispatched on the
 * drop zone's visually hidden button and bubble up to the zone itself, where react-aria listens.
 */
export async function dropFile(
	container: Locator,
	file: DroppedFile,
	label = "Drop file here",
): Promise<void> {
	const target = container.getByRole("button", { name: label });

	const dataTransfer = await target.page().evaluateHandle(
		({ name, mimeType, bytes }) => {
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(new File([new Uint8Array(bytes)], name, { type: mimeType }));
			return dataTransfer;
		},
		{ name: file.name, mimeType: file.mimeType, bytes: [...file.buffer] },
	);

	/**
	 * React-aria tells files from directories with `webkitGetAsEntry()`, which returns `null` for a
	 * file added by script since no file system entry is behind it, and skips the item. A file
	 * dragged in from the desktop has one, so stand in a file entry for the duration of the drop.
	 */
	const restoreGetAsEntry = await target.page().evaluateHandle(() => {
		const descriptor = Object.getOwnPropertyDescriptor(
			DataTransferItem.prototype,
			"webkitGetAsEntry",
		)!;
		const getAsEntry = descriptor.value as (this: DataTransferItem) => FileSystemEntry | null;
		Object.defineProperty(DataTransferItem.prototype, "webkitGetAsEntry", {
			...descriptor,
			value(this: DataTransferItem) {
				return (
					getAsEntry.call(this) ??
					({ isFile: this.kind === "file", isDirectory: false } as FileSystemEntry)
				);
			},
		});
		return () => {
			Object.defineProperty(DataTransferItem.prototype, "webkitGetAsEntry", descriptor);
		};
	});

	try {
		for (const type of ["dragenter", "dragover", "drop"]) {
			await target.dispatchEvent(type, { dataTransfer });
		}
	} finally {
		await restoreGetAsEntry.evaluate((restore) => {
			restore();
		});
		await restoreGetAsEntry.dispose();
		await dataTransfer.dispose();
	}
}
