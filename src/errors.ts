export class MissingRequiredValue extends Error {
	name = "MissingRequiredValue";

	constructor(readonly message: string) {
		super(message);
	}
}
