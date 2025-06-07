import type { RegisterOptions } from "../src/argparser";

export function createRegisterOptions(): RegisterOptions {
	return {
		forceFlagLongNames: new Set(),
		forceFlagShortNames: new Set(),
		forceOptionLongNames: new Set(),
		forceOptionShortNames: new Set(),
	};
}
