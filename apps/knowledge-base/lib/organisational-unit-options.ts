import type { AsyncOption } from "@dariah-eric/ui/use-async-options";

export interface OrganisationalUnitOption {
	documentId: string;
	name: string;
	description: string;
}

export interface OrganisationalUnitDocumentOption extends AsyncOption {
	documentId: string;
}

export function toOrganisationalUnitDocumentOption(
	option: OrganisationalUnitOption,
): OrganisationalUnitDocumentOption {
	return {
		...option,
		id: option.documentId,
	};
}

export function toOrganisationalUnitDocumentOptionsPage(result: {
	items: Array<OrganisationalUnitOption>;
	total: number;
}): { items: Array<OrganisationalUnitDocumentOption>; total: number } {
	return {
		items: result.items.map(toOrganisationalUnitDocumentOption),
		total: result.total,
	};
}
