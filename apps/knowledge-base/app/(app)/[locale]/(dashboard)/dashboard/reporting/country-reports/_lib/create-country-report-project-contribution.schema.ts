import * as v from "valibot";

export const CreateCountryReportProjectContributionActionInputSchema = v.object({
	countryReportId: v.pipe(v.string(), v.uuid()),
	projectId: v.pipe(v.string(), v.uuid()),
	amountEuros: v.pipe(v.string(), v.nonEmpty(), v.toNumber(), v.minValue(0)),
});
