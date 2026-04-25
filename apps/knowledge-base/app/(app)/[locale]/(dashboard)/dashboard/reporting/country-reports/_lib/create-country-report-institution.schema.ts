import * as v from "valibot";

export const CreateCountryReportInstitutionActionInputSchema = v.object({
	countryReportId: v.pipe(v.string(), v.uuid()),
	organisationalUnitId: v.pipe(v.string(), v.uuid()),
});
