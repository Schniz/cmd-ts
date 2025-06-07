import type { ParseContext } from "./argparser";

export type Descriptive = {
	/** A long description that will be shown on help */
	description: string;
};

export type Versioned = {
	/** The item's version */
	version: string;
};

export type Named = {
	/** The item's name */
	name: string;
};

export type Displayed = {
	/** A short display name that summarizes it */
	displayName: string;
};

export type HelpTopic = {
	/**
	 * A category to show in `PrintHelp`
	 */
	category: string;

	/**
	 * How to use this?
	 */
	usage: string;

	/**
	 * A short description of what it does
	 */
	description: string;

	/**
	 * Defaults to show the user
	 */
	defaults: string[];
};

export type ProvidesHelp = {
	helpTopics(): HelpTopic[];
};

export type PrintHelp = {
	/**
	 * Print help for the current item and the current parsing context.
	 */
	printHelp(context: ParseContext): string;
};

export type Aliased = {
	/** More ways to call this item */
	aliases: string[];
};

export type ShortDoc = {
	/**
	 * One letter to support the shorthand format of `-s`
	 * where `s` is the value provided
	 */
	short: string;
};

export type LongDoc = {
	/**
	 * A name to support the long format of `--long`
	 * where `long` is the value provided
	 */
	long: string;
};

export type EnvDoc = {
	/**
	 * An environment variable name
	 *
	 * i.e. `env: 'MY_ARGUMENT'` would allow a default value coming from
	 * the `MY_ARGUMENT` environment variable.
	 */
	env: string;
};
