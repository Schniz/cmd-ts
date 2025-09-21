export type Default<T> = {
	/**
	 * A default value to be provided when a value is missing.
	 * i.e., `string | null` should probably return `null`.
	 * This should be synchronous for fast help generation.
	 */
	defaultValue(): T;
	defaultValueIsSerializable?: boolean;
};

export type OnMissing<T> = {
	/**
	 * A callback that will be executed when the value is missing from user input.
	 * This could be used for interactive prompts, reading from config files,
	 * API calls, or any dynamic fallback. Only executed during actual parsing,
	 * never during help generation.
	 */
	onMissing(): T | Promise<T>;
};
