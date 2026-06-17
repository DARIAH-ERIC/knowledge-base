/**
 * Operational cost calculation for country reports.
 *
 * Implements "Option B" of the DARIAH policy "Policy on the financial value of DARIAH services and
 * other IKCs": each reported contribution, event, social-media presence and service maps to a
 * campaign-configured lump sum, and the sum is compared against the country's threshold.
 *
 * Notably the formula does NOT include project (cash) contributions — those are a separate
 * contribution category and are reported/displayed on their own, outside this calculation. The
 * national website and social media are each counted once per category regardless of how many
 * individual accounts a country reports ("same tag if one or several").
 */

export interface OperationalCostLine {
	key: string;
	label: string;
	quantity: number;
	unitAmount: number;
	total: number;
}

export interface OperationalCost {
	total: number;
	threshold: number | null;
	lines: Array<OperationalCostLine>;
}

export interface OperationalCostCampaignData {
	contributionAmounts: Array<{ roleType: string; amount: number }>;
	countryThresholds: Array<{ countryDocumentId: string; amount: number }>;
	eventAmounts: Array<{ eventType: string; amount: number }>;
	serviceSizes: Array<{ serviceSize: string; visitsThreshold: number | null; amount: number }>;
	socialMediaAmounts: Array<{ category: string; amount: number }>;
}

export interface OperationalCostInput {
	contributions: Array<{ compensationRole: string | null }>;
	smallEvents: number | null;
	mediumEvents: number | null;
	largeEvents: number | null;
	veryLargeEvents: number | null;
	dariahCommissionedEvent: string | null;
	socialMediaAccounts: Array<{
		socialMediaId: string;
		name: string;
		type: string;
		kpis: Array<{ value: number }>;
	}>;
	services: Array<{ serviceId: string; name: string; kpis: Array<{ kpi: string; value: number }> }>;
	campaign: OperationalCostCampaignData;
	countryDocumentId: string;
}

function addOperationalCostLine(
	lines: Array<OperationalCostLine>,
	key: string,
	label: string,
	quantity: number,
	unitAmount: number | undefined,
): void {
	if (quantity <= 0 || unitAmount == null) {
		return;
	}

	lines.push({ key, label, quantity, unitAmount, total: quantity * unitAmount });
}

export function calculateOperationalCost(input: OperationalCostInput): OperationalCost {
	const contributionAmounts = new Map(
		input.campaign.contributionAmounts.map((amount) => [amount.roleType, amount.amount]),
	);
	const eventAmounts = new Map(
		input.campaign.eventAmounts.map((amount) => [amount.eventType, amount.amount]),
	);
	const socialMediaAmounts = new Map(
		input.campaign.socialMediaAmounts.map((amount) => [amount.category, amount.amount]),
	);
	const lines: Array<OperationalCostLine> = [];

	const contributionCounts = new Map<string, number>();
	for (const contribution of input.contributions) {
		if (contribution.compensationRole != null) {
			contributionCounts.set(
				contribution.compensationRole,
				(contributionCounts.get(contribution.compensationRole) ?? 0) + 1,
			);
		}
	}
	for (const [role, quantity] of contributionCounts) {
		addOperationalCostLine(
			lines,
			`contribution-${role}`,
			`Contribution: ${role}`,
			quantity,
			contributionAmounts.get(role),
		);
	}

	addOperationalCostLine(
		lines,
		"events-small",
		"Small events",
		input.smallEvents ?? 0,
		eventAmounts.get("small"),
	);
	addOperationalCostLine(
		lines,
		"events-medium",
		"Medium events",
		input.mediumEvents ?? 0,
		eventAmounts.get("medium"),
	);
	addOperationalCostLine(
		lines,
		"events-large",
		"Large events",
		input.largeEvents ?? 0,
		eventAmounts.get("large"),
	);
	addOperationalCostLine(
		lines,
		"events-very-large",
		"Very large events",
		input.veryLargeEvents ?? 0,
		eventAmounts.get("very_large"),
	);
	addOperationalCostLine(
		lines,
		"events-dariah-commissioned",
		"DARIAH commissioned event",
		input.dariahCommissionedEvent == null || input.dariahCommissionedEvent === "" ? 0 : 1,
		eventAmounts.get("dariah_commissioned"),
	);

	// The national website and social media are each a single lump sum per category, regardless of
	// how many individual accounts a country reports. An account counts towards its category when it
	// has at least one positive KPI.
	const hasActivePresence = (category: "website" | "other"): boolean => {
		return input.socialMediaAccounts.some((account) => {
			const accountCategory = account.type === "website" ? "website" : "other";
			return accountCategory === category && account.kpis.some((kpi) => kpi.value > 0);
		});
	};
	addOperationalCostLine(
		lines,
		"social-media-website",
		"National website",
		hasActivePresence("website") ? 1 : 0,
		socialMediaAmounts.get("website"),
	);
	addOperationalCostLine(
		lines,
		"social-media-other",
		"Social media",
		hasActivePresence("other") ? 1 : 0,
		socialMediaAmounts.get("other"),
	);

	const serviceSizeAmounts = input.campaign.serviceSizes.toSorted(
		(left, right) => (right.visitsThreshold ?? 0) - (left.visitsThreshold ?? 0),
	);
	for (const service of input.services) {
		const visits = service.kpis.find((kpi) => kpi.kpi === "visits")?.value ?? 0;
		const size = serviceSizeAmounts.find((candidate) => visits >= (candidate.visitsThreshold ?? 0));
		addOperationalCostLine(
			lines,
			`service-${service.serviceId}`,
			`Service: ${service.name}`,
			size == null ? 0 : 1,
			size?.amount,
		);
	}

	return {
		total: lines.reduce((sum, line) => sum + line.total, 0),
		threshold:
			input.campaign.countryThresholds.find(
				(threshold) => threshold.countryDocumentId === input.countryDocumentId,
			)?.amount ?? null,
		lines,
	};
}
