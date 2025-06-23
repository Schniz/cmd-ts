import chalk from "chalk";
import * as Result from "./Result";
import type {
	ArgParser,
	ParseContext,
	ParsingError,
	ParsingInto,
	ParsingResult,
} from "./argparser";
import { createCircuitBreaker, handleCircuitBreaker } from "./circuitbreaker";
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
import { entries, flatMap, groupBy, padNoAnsi } from "./utils";
import {
	ArgParser2,
	ParsingError as ParsingError2,
	ParseResult,
} from "./argparser2";

type ArgTypes = Record<
	string,
	ArgParser<any> & ArgParser2<any> & Partial<ProvidesHelp>
>;
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
	ArgParser2<Output<Arguments>> &
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
			const lines: string[] = [];
			let name = context.hotPath?.join(" ") ?? "";
			if (!name) {
				name = config.name;
			}

			name = chalk.bold(name);

			if (config.version) {
				name += ` ${chalk.dim(config.version)}`;
			}

			lines.push(name);

			if (config.description) {
				lines.push(chalk.dim("> ") + config.description);
			}

			const usageBreakdown = groupBy(this.helpTopics(), (x) => x.category);

			for (const [category, helpTopics] of entries(usageBreakdown)) {
				lines.push("");
				lines.push(`${category.toUpperCase()}:`);
				const widestUsage = helpTopics.reduce((len, curr) => {
					return Math.max(len, curr.usage.length);
				}, 0);
				for (const helpTopic of helpTopics) {
					let line = "";
					line += `  ${padNoAnsi(helpTopic.usage, widestUsage, "end")}`;
					line += " - ";
					line += helpTopic.description;
					for (const defaultValue of helpTopic.defaults) {
						line += chalk.dim(` [${defaultValue}]`);
					}
					lines.push(line);
				}
			}

			return lines.join("\n");
		},
		register(opts) {
			for (const [, arg] of argEntries) {
				arg.register?.(opts);
			}
		},
		async parse2(argv) {
			const subparsers = Object.entries(config.args).map(([key, parser]) => {
				return [key, parser] as const;
			});

			const resultObject = {} as Partial<Output<Arguments>>;

			const parsed = await multipleParsers({
				availableParsers: () => subparsers,
				isDone: () => subparsers.length === 0,
				onAtomicResult: (key, result) => {
					const index = subparsers.findIndex(([k]) => k === key);
					if (index > -1) {
						if (!result.continue) {
							subparsers.splice(index, 1);
						}
					}
					if (result.result) {
						resultObject[key] = result.result.value;
					}
				},
			}).parse2(argv);

			return {
				errors: parsed.errors,
				result: { value: resultObject },
				remainingArgv: parsed.remainingArgv,
			};
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
			const parsed = await this.parse(context);
			handleCircuitBreaker(context, this, breaker);

			if (Result.isErr(parsed)) {
				return Result.err(parsed.error);
			}

			return Result.ok(await this.handler(parsed.value));
		},
	};
}

function multipleParsers(opts: {
	isDone(): boolean;
	availableParsers(): readonly (readonly [
		key: string,
		parser: ArgParser2<any>,
	])[];
	onAtomicResult(key: string, result: ParseResult<any>): void;
}): ArgParser2<[key: string, value: any][]> {
	return {
		async parse2(argv) {
			let errors = [] as ParsingError2[];
			let remainingArgv = argv;
			const values = [] as [key: string, value: any][];

			while (!opts.isDone()) {
				errors = errors.filter((x) => x.atomic);
				const parsers = opts.availableParsers();
				if (!parsers.length) break;

				let found = false;
				for (let i = 0; i < parsers.length; i++) {
					const [key, parser] = parsers[i];
					const result = await parser.parse2(remainingArgv);
					remainingArgv = result.remainingArgv;

					if (result.errors.length) {
						errors.push(...result.errors);
						if (errors.some((x) => x.atomic)) {
							opts.onAtomicResult(key, result);
							found = true;
							break;
						}
					} else {
						opts.onAtomicResult(key, result);
						values.push([key, result.result?.value]);
						found = true;
						break;
					}
				}

				if (found) {
					continue;
				}

				break;
			}

			return {
				errors,
				result: { value: values },
				remainingArgv,
			};
		},
	};
}
