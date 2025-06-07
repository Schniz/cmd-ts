import chalk from "chalk";
import * as Result from "./Result";
import type {
	ArgParser,
	ParseContext,
	ParsingResult,
	Register,
} from "./argparser";
import type { Default } from "./default";
import type {
	Descriptive,
	EnvDoc,
	LongDoc,
	ProvidesHelp,
	ShortDoc,
} from "./helpdoc";
import { findOption } from "./newparser/findOption";
import { type HasType, type OutputOf, type Type, extendType } from "./type";
import { boolean as booleanIdentity } from "./types";
import type { AllOrNothing } from "./utils";

type FlagConfig<Decoder extends Type<boolean, any>> = LongDoc &
	HasType<Decoder> &
	Partial<ShortDoc & Descriptive & EnvDoc> &
	AllOrNothing<Default<OutputOf<Decoder>>>;

/**
 * A decoder from `string` to `boolean`
 * works for `true` and `false` only.
 */
export const boolean: Type<string, boolean> = {
	async from(str) {
		if (str === "true") return true;
		if (str === "false") return false;
		throw new Error(
			`expected value to be either "true" or "false". got: "${str}"`,
		);
	},
	displayName: "true/false",
	defaultValue: () => false,
};

export function fullFlag<Decoder extends Type<boolean, any>>(
	config: FlagConfig<Decoder>,
): ArgParser<OutputOf<Decoder>> &
	ProvidesHelp &
	Register &
	Partial<Descriptive> {
	const decoder = extendType(boolean, config.type);

	return {
		description: config.description ?? config.type.description,
		helpTopics() {
			let usage = `--${config.long}`;
			if (config.short) {
				usage += `, -${config.short}`;
			}
			const defaults: string[] = [];

			if (config.env) {
				const env =
					process.env[config.env] === undefined
						? ""
						: `=${chalk.italic(process.env[config.env])}`;
				defaults.push(`env: ${config.env}${env}`);
			}

			try {
				const defaultValueFn = config.defaultValue ?? config.type.defaultValue;
				const defaultValueIsSerializable =
					config.defaultValueIsSerializable ??
					config.type.defaultValueIsSerializable;

				if (defaultValueFn && defaultValueIsSerializable) {
					const defaultValue = defaultValueFn();
					defaults.push("default: " + chalk.italic(defaultValue));
				}
			} catch (e) {}

			return [
				{
					category: "flags",
					usage,
					defaults,
					description:
						config.description ?? config.type.description ?? "self explanatory",
				},
			];
		},
		register(opts) {
			opts.forceFlagLongNames.add(config.long);
			if (config.short) {
				opts.forceFlagShortNames.add(config.short);
			}
		},
		async parse({
			nodes,
			visitedNodes,
		}: ParseContext): Promise<ParsingResult<OutputOf<Decoder>>> {
			const options = findOption(nodes, {
				longNames: [config.long],
				shortNames: config.short ? [config.short] : [],
			}).filter((x) => !visitedNodes.has(x));
			options.forEach((opt) => visitedNodes.add(opt));

			if (options.length > 1) {
				return Result.err({
					errors: [
						{
							nodes: options,
							message: "Expected 1 occurence, got " + options.length,
						},
					],
				});
			}

			const valueFromEnv = config.env ? process.env[config.env] : undefined;
			let rawValue: string;
			let envPrefix = "";

			if (options.length === 0 && valueFromEnv !== undefined) {
				rawValue = valueFromEnv;
				envPrefix = `env[${chalk.italic(config.env)}]: `;
			} else if (
				options.length === 0 &&
				typeof config.type.defaultValue === "function"
			) {
				try {
					return Result.ok(config.type.defaultValue());
				} catch (e: any) {
					const message = `Default value not found for '--${config.long}': ${e.message}`;
					return Result.err({
						errors: [{ message, nodes: [] }],
					});
				}
			} else if (options.length === 1) {
				rawValue = options[0].value?.node.raw ?? "true";
			} else {
				return Result.err({
					errors: [
						{ nodes: [], message: `No value provided for --${config.long}` },
					],
				});
			}

			const decoded = await Result.safeAsync(decoder.from(rawValue));

			if (Result.isErr(decoded)) {
				return Result.err({
					errors: [
						{
							nodes: options,
							message: envPrefix + decoded.error.message,
						},
					],
				});
			}

			return decoded;
		},
	};
}

type BooleanType = Type<boolean, boolean>;

/**
 * Decodes an argument which is in the form of a key and a boolean value, and allows parsing the following ways:
 *
 * - `--long` where `long` is the provided `long`
 * - `-s=value` where `s` is the provided `short`
 * Shorthand forms can be combined:
 * - `-abcd` will call all flags for the short forms of `a`, `b`, `c` and `d`.
 * @param config flag configurations
 */
export function flag<Decoder extends Type<boolean, any>>(
	config: FlagConfig<Decoder>,
): ArgParser<OutputOf<Decoder>> &
	ProvidesHelp &
	Register &
	Partial<Descriptive>;
export function flag(
	config: LongDoc &
		Partial<HasType<never> & ShortDoc & Descriptive & EnvDoc> &
		AllOrNothing<Default<OutputOf<BooleanType>>>,
): ArgParser<OutputOf<BooleanType>> &
	ProvidesHelp &
	Register &
	Partial<Descriptive>;
export function flag(
	config: LongDoc &
		Partial<HasType<any> & ShortDoc & Descriptive & EnvDoc> &
		AllOrNothing<Default<OutputOf<any>>>,
): ArgParser<OutputOf<any>> & ProvidesHelp & Register & Partial<Descriptive> {
	return fullFlag({
		type: booleanIdentity,
		...config,
	});
}
