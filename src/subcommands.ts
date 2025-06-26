import chalk from "chalk";
import didYouMean from "didyoumean";
import * as Result from "./Result";
// import { Runner, Into } from './runner';
import type {
	ArgParser,
	ParseContext,
	ParsingInto,
	ParsingResult,
} from "./argparser";
import { createCircuitBreaker, handleCircuitBreaker } from "./circuitbreaker";
import type { From } from "./from";
import type { Aliased, Descriptive, Named, Versioned } from "./helpdoc";
import { positional } from "./positional";
import type { Runner } from "./runner";
import { extendType } from "./type";
import { string } from "./types";
import { type ArgParser2, ParsingError } from "./argparser2";
import * as AP3 from "./argparser3";
import { Help, Version } from "./effects";

type Output<
	Commands extends Record<string, ArgParser<any> & Runner<any, any>>,
> = {
	[key in keyof Commands]: { command: key; args: ParsingInto<Commands[key]> };
}[keyof Commands];

type RunnerOutput<
	Commands extends Record<string, Runner<any, any> & ArgParser<any>>,
> = {
	[key in keyof Commands]: {
		command: key;
		value: Commands[key] extends Runner<any, infer X> ? X : never;
	};
}[keyof Commands];

/**
 * Combine multiple `command`s into one
 */
export function subcommands<
	const Commands extends Record<
		string,
		ArgParser<any> & Runner<any, any> & Partial<Descriptive & Aliased>
	>,
>(config: {
	name: string;
	version?: string;
	cmds: Commands;
	description?: string;
}): ArgParser<Output<Commands>> &
	ArgParser2<keyof Commands | Help | Version> &
	AP3.Yielder<Help | Version | Output<Commands>> &
	Named &
	Partial<Descriptive & Versioned> &
	Runner<Output<Commands>, RunnerOutput<Commands>> {
	const circuitbreaker = createCircuitBreaker(!!config.version);
	const type: From<string, keyof Commands> = {
		async from(str) {
			const commands = Object.entries(config.cmds).map(([name, cmd]) => {
				return {
					cmdName: name as keyof Commands,
					names: [name, ...(cmd.aliases ?? [])],
				};
			});
			const cmd = commands.find((x) => x.names.includes(str));
			if (cmd) {
				return cmd.cmdName;
			}
			let errorMessage = "Not a valid subcommand name";

			const closeOptions = didYouMean(
				str,
				flatMap(commands, (x) => x.names),
			);
			if (closeOptions) {
				const option = Array.isArray(closeOptions)
					? closeOptions[0]
					: closeOptions;
				errorMessage += `\nDid you mean ${chalk.italic(option)}?`;
			}

			throw new Error(errorMessage);
		},
	};

	const typeWithCircuitBreakers = extendType(string, {
		async from(str) {
			if (config.version && (str === "--version" || str === "-V")) {
				return Version;
			}
			if (str === "--help") {
				return Help;
			}
			return await type.from(str);
		},
	});

	const subcommand = positional({
		displayName: "subcommand",
		description: `one of ${Object.keys(config.cmds).join(", ")}`,
		type,
	});

	function normalizeContext(context: ParseContext) {
		if (context.hotPath?.length === 0) {
			context.hotPath.push(config.name);
		}

		// Called without any arguments? We default to subcommand help.
		if (!context.nodes.some((n) => !context.visitedNodes.has(n))) {
			context.nodes.push({
				type: "longOption",
				index: 0,
				key: "help",
				raw: "--help",
			});
		}
	}

	return {
		version: config.version,
		description: config.description,
		name: config.name,
		handler: (value) => {
			const cmd = config.cmds[value.command];
			return cmd.handler(value.args);
		},
		register(opts) {
			for (const cmd of Object.values(config.cmds)) {
				cmd.register(opts);
			}
			circuitbreaker.register(opts);
		},
		printHelp(context) {
			const lines: string[] = [];
			const argsSoFar = context.hotPath?.join(" ") ?? "cli";

			lines.push(chalk.bold(argsSoFar + chalk.italic(" <subcommand>")));

			if (config.description) {
				lines.push(chalk.dim("> ") + config.description);
			}

			lines.push("");
			lines.push(`where ${chalk.italic("<subcommand>")} can be one of:`);
			lines.push("");

			for (const key of Object.keys(config.cmds)) {
				const cmd = config.cmds[key];
				let description = cmd.description ?? "";
				description = description && ` - ${description} `;
				if (cmd.aliases?.length) {
					const aliasTxt = cmd.aliases.length === 1 ? "alias" : "aliases";
					const aliases = cmd.aliases.join(", ");
					description += chalk.dim(`[${aliasTxt}: ${aliases}]`);
				}
				const row = chalk.dim("- ") + key + description;
				lines.push(row.trim());
			}

			const helpCommand = chalk.yellow(`${argsSoFar} <subcommand> --help`);

			lines.push("");
			lines.push(chalk.dim(`For more help, try running \`${helpCommand}\``));
			return lines.join("\n");
		},
		async parse(
			context: ParseContext,
		): Promise<ParsingResult<Output<Commands>>> {
			normalizeContext(context);
			const parsed = await subcommand.parse(context);

			if (Result.isErr(parsed)) {
				return Result.err({
					errors: parsed.error.errors,
					partialValue: {},
				});
			}

			context.hotPath?.push(parsed.value as string);

			const cmd = config.cmds[parsed.value];
			const parsedCommand = await cmd.parse(context);
			if (Result.isErr(parsedCommand)) {
				return Result.err({
					errors: parsedCommand.error.errors,
					partialValue: {
						command: parsed.value,
						args: parsedCommand.error.partialValue,
					},
				});
			}
			return Result.ok({
				args: parsedCommand.value,
				command: parsed.value,
			});
		},
		async parse2(argv) {
			const arg = argv[0];

			const value = await Result.safeAsync(
				typeWithCircuitBreakers.from(arg.value),
			);

			return Result.match(value, {
				onOk: (value) => ({
					errors: [],
					remainingArgv: argv.slice(1),
					result: { value },
				}),
				onErr: (cause) => ({
					errors: [ParsingError.make(arg, cause).asAtomic()],
					result: null,
					remainingArgv: argv,
				}),
			});
		},
		...AP3.yielder(
			new AP3.Parser(async function* () {
				const [arg] = yield* AP3.effects.consume(1);
				if (!arg) {
					return yield* AP3.effects.break(
						ParsingError.forUnknownArgv(
							new Error("No value provided for subcommand"),
						),
					);
				}

				const value = await Result.safeAsync(
					typeWithCircuitBreakers.from(arg.value),
				);

				if (Result.isErr(value)) {
					return yield* AP3.effects.break(ParsingError.make(arg, value.error));
				}

				return value.value;
			}),
		),
		async run(context): Promise<ParsingResult<RunnerOutput<Commands>>> {
			normalizeContext(context);
			const parsedSubcommand = await subcommand.parse(context);

			if (Result.isErr(parsedSubcommand)) {
				const breaker = await circuitbreaker.parse(context);
				handleCircuitBreaker(context, this, breaker);

				return Result.err({ ...parsedSubcommand.error, partialValue: {} });
			}

			context.hotPath?.push(parsedSubcommand.value as string);

			const cmd = config.cmds[parsedSubcommand.value];
			const commandRun = await cmd.run(context);

			if (Result.isOk(commandRun)) {
				return Result.ok({
					command: parsedSubcommand.value,
					value: commandRun.value,
				});
			}

			return Result.err({
				...commandRun.error,
				partialValue: {
					command: parsedSubcommand.value,
					value: commandRun.error.partialValue,
				},
			});
		},
	};
}

function flatMap<T, R>(array: T[], f: (t: T) => R[]): R[] {
	const rs: R[] = [];
	for (const item of array) {
		rs.push(...f(item));
	}
	return rs;
}
