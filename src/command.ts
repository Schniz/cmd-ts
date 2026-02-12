import * as Result from "./Result";
import type {
	ArgParser,
	ParseContext,
	ParsingError,
	ParsingInto,
	ParsingResult,
} from "./argparser";
import { createCircuitBreaker, handleCircuitBreaker } from "./circuitbreaker";
import {
	type CommandHelpData,
	type Example,
	getHelpFormatter,
} from "./helpFormatter";
import type {
	Aliased,
	Descriptive,
	Named,
	PrintHelp,
	ProvidesHelp,
	Versioned,
} from "./helpdoc";
import type { AstNode } from "./newparser/parser";
import type { Runner } from "./runner";
import { entries, flatMap } from "./utils";

type ArgTypes = Record<string, ArgParser<any> & Partial<ProvidesHelp>>;
type HandlerFunc<Args extends ArgTypes> = (args: Output<Args>) => any;

type CommandConfig<
	Arguments extends ArgTypes,
	Handler extends HandlerFunc<Arguments>,
> = {
	args: Arguments;
	version?: string;
	name: string;
	description?: string;
	handler: Handler;
	aliases?: string[];
	/** Examples to show in help output */
	examples?: Example[];
};

type Output<Args extends ArgTypes> = {
	[key in keyof Args]: ParsingInto<Args[key]>;
};

/**
 * A command line utility.
 *
 * A combination of multiple flags, options and arguments
 * with a common name and a handler that expects them as input.
 */
export function command<
	Arguments extends ArgTypes,
	Handler extends HandlerFunc<Arguments>,
>(
	config: CommandConfig<Arguments, Handler>,
): ArgParser<Output<Arguments>> &
	PrintHelp &
	ProvidesHelp &
	Named &
	Runner<Output<Arguments>, ReturnType<Handler>> &
	Partial<Versioned & Descriptive & Aliased> {
	const argEntries = entries(config.args);
	const circuitbreaker = createCircuitBreaker(!!config.version);

	return {
		name: config.name,
		aliases: config.aliases,
		handler: config.handler,
		description: config.description,
		version: config.version,
		helpTopics() {
			return flatMap(
				Object.values(config.args).concat([circuitbreaker]),
				(x) => x.helpTopics?.() ?? [],
			);
		},
		printHelp(context) {
			const data: CommandHelpData = {
				name: config.name,
				path: context.hotPath ?? [config.name],
				version: config.version,
				description: config.description,
				aliases: config.aliases,
				helpTopics: this.helpTopics(),
				examples: config.examples,
			};
			return getHelpFormatter().formatCommand(data, context);
		},
		register(opts) {
			for (const [, arg] of argEntries) {
				arg.register?.(opts);
			}
		},
		async parse(
			context: ParseContext,
		): Promise<ParsingResult<Output<Arguments>>> {
			if (context.hotPath?.length === 0) {
				context.hotPath.push(config.name);
			}

			const resultObject = {} as Output<Arguments>;
			const errors: ParsingError[] = [];

			for (const [argName, arg] of argEntries) {
				const result = await arg.parse(context);
				if (Result.isErr(result)) {
					errors.push(...result.error.errors);
				} else {
					resultObject[argName] = result.value;
				}
			}

			const unknownArguments: AstNode[] = [];
			for (const node of context.nodes) {
				if (context.visitedNodes.has(node)) {
					continue;
				}

				if (node.type === "forcePositional") {
				} else if (node.type === "shortOptions") {
					for (const option of node.options) {
						if (context.visitedNodes.has(option)) {
							continue;
						}
						unknownArguments.push(option);
					}
				} else {
					unknownArguments.push(node);
				}
			}

			if (unknownArguments.length > 0) {
				errors.push({
					message: "Unknown arguments",
					nodes: unknownArguments,
				});
			}

			if (errors.length > 0) {
				return Result.err({
					errors: errors,
					partialValue: resultObject,
				});
			}
			return Result.ok(resultObject);
		},
		async run(context) {
			const breaker = await circuitbreaker.parse(context);
			handleCircuitBreaker(context, this, breaker);
			const parsed = await this.parse(context);

			if (Result.isErr(parsed)) {
				return Result.err(parsed.error);
			}

			return Result.ok(await this.handler(parsed.value));
		},
	};
}
