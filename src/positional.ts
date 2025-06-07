import chalk from "chalk";
import * as Result from "./Result";
import type { ArgParser, ParseContext, ParsingResult } from "./argparser";
import type { Default } from "./default";
import type { OutputOf } from "./from";
import type { Descriptive, Displayed, ProvidesHelp } from "./helpdoc";
import type { PositionalArgument } from "./newparser/parser";
import type { HasType, Type } from "./type";
import { string } from "./types";
import type { AllOrNothing } from "./utils";

type PositionalConfig<Decoder extends Type<string, any>> = HasType<Decoder> &
	Partial<Displayed & Descriptive> &
	AllOrNothing<Default<OutputOf<Decoder>>>;

type PositionalParser<Decoder extends Type<string, any>> = ArgParser<
	OutputOf<Decoder>
> &
	ProvidesHelp &
	Partial<Descriptive>;

function fullPositional<Decoder extends Type<string, any>>(
	config: PositionalConfig<Decoder>,
): PositionalParser<Decoder> {
	const displayName = config.displayName ?? config.type.displayName ?? "arg";

	return {
		description: config.description ?? config.type.description,
		helpTopics() {
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
						defaults.push("optional");
					}
				} catch (e) {}
			}

			const usage =
				defaults.length > 0 ? `[${displayName}]` : `<${displayName}>`;

			return [
				{
					category: "arguments",
					usage,
					description:
						config.description ?? config.type.description ?? "self explanatory",
					defaults,
				},
			];
		},
		register(_opts) {},
		async parse({
			nodes,
			visitedNodes,
		}: ParseContext): Promise<ParsingResult<OutputOf<Decoder>>> {
			const positionals = nodes.filter(
				(node): node is PositionalArgument =>
					node.type === "positionalArgument" && !visitedNodes.has(node),
			);

			const defaultValueFn = config.defaultValue ?? config.type.defaultValue;

			const positional = positionals[0];

			if (!positional) {
				if (defaultValueFn) {
					return Result.ok(defaultValueFn());
				} else {
					return Result.err({
						errors: [
							{
								nodes: [],
								message: `No value provided for ${displayName}`,
							},
						],
					});
				}
			}

			visitedNodes.add(positional);
			const decoded = await Result.safeAsync(config.type.from(positional.raw));

			if (Result.isErr(decoded)) {
				return Result.err({
					errors: [
						{
							nodes: [positional],
							message: decoded.error.message,
						},
					],
				});
			}

			return Result.ok(decoded.value);
		},
	};
}

type StringType = Type<string, string>;

/**
 * A positional command line argument.
 *
 * Decodes one argument that is not a flag or an option:
 * In `hello --key value world` we have 2 positional arguments — `hello` and `world`.
 *
 * @param config positional argument config
 */
export function positional<Decoder extends Type<string, any>>(
	config: HasType<Decoder> & Partial<Displayed & Descriptive>,
): PositionalParser<Decoder>;
export function positional(
	config?: Partial<HasType<never> & Displayed & Descriptive>,
): PositionalParser<StringType>;
export function positional(
	config?: Partial<HasType<any>> & Partial<Displayed & Descriptive>,
): PositionalParser<any> {
	return fullPositional({
		type: string,
		...config,
	});
}
