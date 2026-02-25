import * as v from "valibot";

export const SetupTwoFactorActionInputSchema = v.object({
	code: v.pipe(v.string(), v.nonEmpty()),
	key: v.pipe(v.string(), v.nonEmpty()),
});

export const TotpKeySchema = v.pipe(
	v.string(),
	v.length(28),
	v.transform(decodeBase64),
	v.check((key) => {
		return key.byteLength === 20;
	}),
);
