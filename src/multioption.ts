import {
	ArgParser,
	ParsingResult,
	ParseContext,
	ParsingError,
	Register,
} from "./argparser";
import { OutputOf } from "./from";
import { findOption } from "./newparser/findOption";
import { ProvidesHelp, LongDoc, ShortDoc, Descriptive } from "./helpdoc";
import { Type, HasType } from "./type";
import { AstNode } from "./newparser/parser";
import * as Result from "./Result";
import { Default } from "./default";
import chalk from "chalk";

type MultiOptionConfig<Decoder extends Type<string[], any>> = HasType<Decoder> &
	LongDoc &
	Partial<ShortDoc & Descriptive & Default<OutputOf<Decoder>>>;

/**
 * Like `option`, but can accept multiple options, and expects a decoder from a list of strings.
 * An error will highlight all option occurences.
 */
export function multioption<Decoder extends Type<string[], any>>(
	config: MultiOptionConfig<Decoder>,
): ArgParser<OutputOf<Decoder>> & ProvidesHelp & Register {
	return {
		helpTopics() {
			const displayName = config.type.displayName ?? "value";
			let usage = `--${config.long} <${displayName}>`;
			if (config.short) {
				usage += `, -${config.short}=<${displayName}>`;
			}

			const defaults: string[] = [];

			const defaultValueFn = config.defaultValue ?? config.type.defaultValue;

			if (defaultValueFn) {
				try {
					const defaultValue = defaultValueFn();
					if (
						config.defaultValueIsSerializable ??
						config.type.defaultValueIsSerializable
					) {
						defaults.push("default: " + chalk.italic(defaultValue));
					} else {
						defaults.push("[...optional]");
					}
				} catch (e) {}
			}

			return [
				{
					category: "options",
					usage,
					defaults,
					description: config.description ?? "self explanatory",
				},
			];
		},
		register(opts) {
			opts.forceOptionLongNames.add(config.long);
			if (config.short) {
				opts.forceOptionShortNames.add(config.short);
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

			const defaultValueFn = config.defaultValue ?? config.type.defaultValue;

			if (options.length === 0 && typeof defaultValueFn === "function") {
				try {
					return Result.ok(defaultValueFn());
				} catch (e: any) {
					const message = `Failed to resolve default value for '--${config.long}': ${e.message}`;
					return Result.err({
						errors: [
							{
								nodes: [],
								message,
							},
						],
					});
				}
			}

			for (const option of options) {
				visitedNodes.add(option);
			}

			const optionValues: string[] = [];
			const errors: ParsingError[] = [];
			const flagNodes: AstNode[] = [];

			for (const option of options) {
				const providedValue = option.value?.node.raw;
				if (providedValue === undefined) {
					flagNodes.push(option);
					continue;
				}
				optionValues.push(providedValue);
			}

			if (flagNodes.length > 0) {
				errors.push({
					nodes: flagNodes,
					message: `Expected to get a value, found a flag`,
				});
			}

			if (errors.length > 0) {
				return Result.err({ errors });
			}

			const multiDecoded = await Result.safeAsync(
				config.type.from(optionValues),
			);

			if (Result.isErr(multiDecoded)) {
				return Result.err({
					errors: [{ nodes: options, message: multiDecoded.error.message }],
				});
			}

			return multiDecoded;
		},
	};
}
