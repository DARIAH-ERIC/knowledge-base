export function formatFileSize(bytes: number): string {
	const megabytes = bytes / (1024 * 1024);

	if (Number.isInteger(megabytes)) {
		return `${String(megabytes)} MB`;
	}

	return `${megabytes.toFixed(1)} MB`;
}
